-- ============================================================
-- 1) DAILY ADVICE SYSTEM
-- ============================================================

-- Table for daily advice content
CREATE TABLE IF NOT EXISTS public.daily_advice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  title text NOT NULL,
  text text NOT NULL,
  category text NOT NULL CHECK (category IN ('nutrition', 'organisation', 'motivation', 'recette', 'economie')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS for daily_advice
ALTER TABLE public.daily_advice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active daily advice"
  ON public.daily_advice
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage daily_advice"
  ON public.daily_advice
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Track which advice users have seen
CREATE TABLE IF NOT EXISTS public.user_daily_advice_seen (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advice_id uuid NOT NULL REFERENCES public.daily_advice(id) ON DELETE CASCADE,
  seen_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, advice_id)
);

ALTER TABLE public.user_daily_advice_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own advice seen"
  ON public.user_daily_advice_seen
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2) REFERRAL PROGRAM TABLES
-- ============================================================

-- User referral codes (one per user)
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referral code"
  ON public.referral_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own referral code"
  ON public.referral_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage referral_codes"
  ON public.referral_codes
  FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Referral attributions (who referred whom)
CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attributions as referrer"
  ON public.referral_attributions
  FOR SELECT
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Service role can manage referral_attributions"
  ON public.referral_attributions
  FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Referral events (signup, qualified, reward_granted)
CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('signup', 'qualified', 'reward_granted')),
  reference_type text,
  reference_id text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral events as referrer"
  ON public.referral_events
  FOR SELECT
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Service role can manage referral_events"
  ON public.referral_events
  FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Referral clicks tracking (optional but recommended)
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  referrer_user_id uuid,
  ip_hash text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage referral_clicks"
  ON public.referral_clicks
  FOR ALL
  USING (auth.role() = 'service_role'::text);

CREATE POLICY "Users can view own referral clicks"
  ON public.referral_clicks
  FOR SELECT
  USING (auth.uid() = referrer_user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON public.referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON public.referral_events(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer ON public.referral_attributions(referrer_user_id);

-- ============================================================
-- 3) SEED INITIAL DAILY ADVICE
-- ============================================================

INSERT INTO public.daily_advice (date, title, text, category) VALUES
  (CURRENT_DATE, 'Commence par les protéines', 'Assure-toi d''inclure une source de protéines à chaque repas : œufs, légumineuses, poisson ou viande. Cela aide à maintenir la satiété et préserver ta masse musculaire.', 'nutrition'),
  (CURRENT_DATE + INTERVAL '1 day', 'Prépare ta semaine le dimanche', 'Consacre 1h le dimanche à préparer tes bases : légumes coupés, céréales cuites, sauces maison. Tu gagneras un temps précieux en semaine.', 'organisation'),
  (CURRENT_DATE + INTERVAL '2 days', 'Un objectif à la fois', 'Ne change pas tout d''un coup. Commence par un seul changement alimentaire et maintiens-le pendant 3 semaines avant d''en ajouter un autre.', 'motivation'),
  (CURRENT_DATE + INTERVAL '3 days', 'Les fibres, tes alliées', 'Augmente progressivement ta consommation de fibres avec des légumes, fruits et céréales complètes. Elles favorisent la digestion et la satiété.', 'nutrition'),
  (CURRENT_DATE + INTERVAL '4 days', 'Achète de saison', 'Les fruits et légumes de saison sont moins chers, plus savoureux et plus nutritifs. Consulte le calendrier des saisons pour faire les bons choix.', 'economie')
ON CONFLICT (date) DO NOTHING;

-- ============================================================
-- 4) MAIN DASHBOARD RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_get_user_dashboard(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_wallet jsonb;
  v_week jsonb;
  v_today_meal jsonb;
  v_shopping_list_status jsonb;
  v_streaks jsonb;
  v_gamification jsonb;
  v_advice_of_day jsonb;
  v_referral jsonb;
  v_week_start date;
  v_today date;
  v_advice_row record;
BEGIN
  -- Calculate current week start (Monday) in Europe/Paris timezone
  v_today := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_week_start := v_today - (EXTRACT(DOW FROM v_today)::int + 6) % 7;

  -- 1) WALLET
  SELECT jsonb_build_object(
    'balance_total', COALESCE(uw.subscription_credits, 0) + COALESCE(uw.lifetime_credits, 0),
    'balance_subscription', COALESCE(uw.subscription_credits, 0),
    'balance_lifetime', COALESCE(uw.lifetime_credits, 0)
  ) INTO v_wallet
  FROM public.user_wallets uw
  WHERE uw.user_id = p_user_id;
  
  IF v_wallet IS NULL THEN
    v_wallet := jsonb_build_object('balance_total', 0, 'balance_subscription', 0, 'balance_lifetime', 0);
  END IF;

  -- 2) WEEK MENU
  SELECT jsonb_build_object(
    'week_start', v_week_start,
    'menu_exists', mp.id IS NOT NULL,
    'meals_count', COALESCE(jsonb_array_length(mp.items), 0)
  ) INTO v_week
  FROM public.meal_plans mp
  WHERE mp.user_id = p_user_id
    AND mp.week_of = v_week_start
  LIMIT 1;
  
  IF v_week IS NULL THEN
    v_week := jsonb_build_object('week_start', v_week_start, 'menu_exists', false, 'meals_count', 0);
  END IF;

  -- 3) TODAY'S MEAL
  SELECT jsonb_build_object(
    'exists', true,
    'lunch_recipe_id', udr.lunch_recipe_id,
    'lunch_title', lr.title,
    'dinner_recipe_id', udr.dinner_recipe_id,
    'dinner_title', dr.title
  ) INTO v_today_meal
  FROM public.user_daily_recipes udr
  LEFT JOIN public.recipes lr ON lr.id = udr.lunch_recipe_id
  LEFT JOIN public.recipes dr ON dr.id = udr.dinner_recipe_id
  WHERE udr.user_id = p_user_id
    AND udr.date = v_today
  LIMIT 1;
  
  IF v_today_meal IS NULL THEN
    v_today_meal := jsonb_build_object('exists', false, 'lunch_recipe_id', null, 'dinner_recipe_id', null);
  END IF;

  -- 4) SHOPPING LIST STATUS
  SELECT jsonb_build_object(
    'exists', gl.id IS NOT NULL,
    'items_total', COALESCE(jsonb_array_length(gl.items), 0),
    'items_checked', (
      SELECT COUNT(*) 
      FROM jsonb_array_elements(gl.items) AS item 
      WHERE (item->>'checked')::boolean = true
    )
  ) INTO v_shopping_list_status
  FROM public.grocery_lists gl
  JOIN public.meal_plans mp ON mp.id = gl.weekly_menu_id
  WHERE gl.user_id = p_user_id
    AND mp.week_of = v_week_start
  LIMIT 1;
  
  IF v_shopping_list_status IS NULL THEN
    v_shopping_list_status := jsonb_build_object('exists', false, 'items_total', 0, 'items_checked', 0);
  END IF;

  -- 5) STREAKS
  SELECT jsonb_build_object(
    'current_days', COALESCE(uds.serie_en_cours_set_count, 0),
    'best_days', COALESCE(ug.best_streak, 0)
  ) INTO v_streaks
  FROM public.user_dashboard_stats uds
  LEFT JOIN public.user_gamification ug ON ug.user_id = uds.user_id
  WHERE uds.user_id = p_user_id;
  
  IF v_streaks IS NULL THEN
    v_streaks := jsonb_build_object('current_days', 0, 'best_days', 0);
  END IF;

  -- 6) GAMIFICATION
  SELECT jsonb_build_object(
    'level', COALESCE(ug.level, 1),
    'xp', COALESCE(ug.points, 0),
    'xp_to_next', COALESCE(ug.level, 1) * 100,
    'badges', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('code', b.code, 'name', b.name, 'icon', b.icon))
       FROM public.user_badges ub
       JOIN public.badges b ON b.code = ub.badge_code
       WHERE ub.user_id = p_user_id),
      '[]'::jsonb
    )
  ) INTO v_gamification
  FROM public.user_gamification ug
  WHERE ug.user_id = p_user_id;
  
  IF v_gamification IS NULL THEN
    v_gamification := jsonb_build_object('level', 1, 'xp', 0, 'xp_to_next', 100, 'badges', '[]'::jsonb);
  END IF;

  -- 7) ADVICE OF THE DAY
  SELECT * INTO v_advice_row
  FROM public.daily_advice
  WHERE date = v_today AND is_active = true
  LIMIT 1;
  
  -- Fallback to latest active advice if none for today
  IF v_advice_row IS NULL THEN
    SELECT * INTO v_advice_row
    FROM public.daily_advice
    WHERE is_active = true
    ORDER BY date DESC
    LIMIT 1;
  END IF;
  
  IF v_advice_row IS NOT NULL THEN
    v_advice_of_day := jsonb_build_object(
      'id', v_advice_row.id,
      'title', v_advice_row.title,
      'text', v_advice_row.text,
      'category', v_advice_row.category,
      'date', v_advice_row.date,
      'is_today', v_advice_row.date = v_today
    );
  ELSE
    v_advice_of_day := jsonb_build_object(
      'id', null,
      'title', 'Bienvenue sur NutriZen',
      'text', 'Planifie tes repas pour gagner du temps et manger équilibré.',
      'category', 'motivation',
      'date', v_today,
      'is_today', true
    );
  END IF;

  -- 8) REFERRAL
  SELECT jsonb_build_object(
    'code', COALESCE(rc.code, ''),
    'has_code', rc.code IS NOT NULL,
    'clicks', COALESCE((SELECT COUNT(*) FROM public.referral_clicks WHERE referral_code = rc.code), 0),
    'signups', COALESCE((SELECT COUNT(*) FROM public.referral_events re WHERE re.referrer_user_id = p_user_id AND re.event_type = 'signup'), 0),
    'qualified', COALESCE((SELECT COUNT(*) FROM public.referral_events re WHERE re.referrer_user_id = p_user_id AND re.event_type = 'qualified'), 0),
    'rewards_earned', COALESCE((SELECT COUNT(*) FROM public.referral_events re WHERE re.referrer_user_id = p_user_id AND re.event_type = 'reward_granted'), 0)
  ) INTO v_referral
  FROM public.referral_codes rc
  WHERE rc.user_id = p_user_id;
  
  IF v_referral IS NULL THEN
    v_referral := jsonb_build_object('code', '', 'has_code', false, 'clicks', 0, 'signups', 0, 'qualified', 0, 'rewards_earned', 0);
  END IF;

  -- Build final result
  v_result := jsonb_build_object(
    'wallet', v_wallet,
    'week', v_week,
    'today_meal', v_today_meal,
    'shopping_list_status', v_shopping_list_status,
    'streaks', v_streaks,
    'gamification', v_gamification,
    'advice_of_day', v_advice_of_day,
    'referral', v_referral,
    'last_updated_at', now()
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 5) GENERATE REFERRAL CODE FOR USER
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_user_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Generate unique code
  LOOP
    v_code := upper(substr(md5(random()::text || p_user_id::text), 1, 8));
    
    BEGIN
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique referral code';
      END IF;
    END;
  END LOOP;
END;
$$;

-- ============================================================
-- 6) HANDLE REFERRAL SIGNUP (called when new user signs up with ref code)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_referral_signup(
  p_referral_code text,
  p_new_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_idempotency_key text;
  v_existing_attribution uuid;
BEGIN
  -- Validate input
  IF p_referral_code IS NULL OR p_referral_code = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code de parrainage requis');
  END IF;

  -- Find referrer
  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = upper(p_referral_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code de parrainage invalide');
  END IF;
  
  -- Cannot refer yourself
  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Vous ne pouvez pas vous parrainer vous-même');
  END IF;
  
  -- Check if already attributed
  SELECT id INTO v_existing_attribution
  FROM public.referral_attributions
  WHERE referred_user_id = p_new_user_id;
  
  IF v_existing_attribution IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Parrainage déjà enregistré', 'already_attributed', true);
  END IF;
  
  -- Create attribution
  INSERT INTO public.referral_attributions (referrer_user_id, referred_user_id, source)
  VALUES (v_referrer_id, p_new_user_id, 'ref_code');
  
  -- Create signup event (idempotent)
  v_idempotency_key := 'ref_signup:' || p_new_user_id::text;
  
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, idempotency_key)
  VALUES (v_referrer_id, p_new_user_id, 'signup', v_idempotency_key)
  ON CONFLICT (idempotency_key) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'Parrainage enregistré avec succès', 'referrer_id', v_referrer_id);
END;
$$;

-- ============================================================
-- 7) HANDLE REFERRAL QUALIFICATION (called on first credits purchase)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_referral_qualification(
  p_referred_user_id uuid,
  p_reference_type text DEFAULT NULL,
  p_reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attribution record;
  v_qualified_key text;
  v_reward_key text;
  v_reward_credits int := 10; -- Reward amount for referrer
BEGIN
  -- Find attribution
  SELECT * INTO v_attribution
  FROM public.referral_attributions
  WHERE referred_user_id = p_referred_user_id;
  
  IF v_attribution IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No attribution found');
  END IF;
  
  -- Check if already qualified
  v_qualified_key := 'ref_qualified:' || p_referred_user_id::text;
  
  IF EXISTS (SELECT 1 FROM public.referral_events WHERE idempotency_key = v_qualified_key) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already qualified', 'already_qualified', true);
  END IF;
  
  -- Create qualified event
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, reference_type, reference_id, idempotency_key)
  VALUES (v_attribution.referrer_user_id, p_referred_user_id, 'qualified', p_reference_type, p_reference_id, v_qualified_key);
  
  -- Grant reward to referrer (idempotent)
  v_reward_key := 'ref_reward:' || p_referred_user_id::text;
  
  IF NOT EXISTS (SELECT 1 FROM public.referral_events WHERE idempotency_key = v_reward_key) THEN
    -- Add credits to referrer wallet
    UPDATE public.user_wallets
    SET lifetime_credits = lifetime_credits + v_reward_credits
    WHERE user_id = v_attribution.referrer_user_id;
    
    -- If no wallet, create one
    IF NOT FOUND THEN
      INSERT INTO public.user_wallets (user_id, subscription_credits, lifetime_credits)
      VALUES (v_attribution.referrer_user_id, 0, v_reward_credits);
    END IF;
    
    -- Record credit transaction
    INSERT INTO public.credit_transactions (user_id, delta, credit_type, reason, reference_type, reference_id, idempotency_key)
    VALUES (v_attribution.referrer_user_id, v_reward_credits, 'lifetime', 'referral_reward', 'referral', p_referred_user_id::text, 'credit_' || v_reward_key);
    
    -- Create reward_granted event
    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, reference_type, reference_id, idempotency_key)
    VALUES (v_attribution.referrer_user_id, p_referred_user_id, 'reward_granted', 'credits', v_reward_credits::text, v_reward_key);
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Referral qualified and reward granted', 'reward_credits', v_reward_credits);
END;
$$;
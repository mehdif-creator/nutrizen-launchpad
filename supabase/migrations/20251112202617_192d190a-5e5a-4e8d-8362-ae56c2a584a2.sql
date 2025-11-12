-- Fix RLS on user_weekly_menu_items
ALTER TABLE public.user_weekly_menu_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_weekly_menu_items
CREATE POLICY "Users can view own menu items"
ON public.user_weekly_menu_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_weekly_menus m
    WHERE m.id = user_weekly_menu_items.weekly_menu_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own menu items"
ON public.user_weekly_menu_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_weekly_menus m
    WHERE m.id = user_weekly_menu_items.weekly_menu_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own menu items"
ON public.user_weekly_menu_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_weekly_menus m
    WHERE m.id = user_weekly_menu_items.weekly_menu_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own menu items"
ON public.user_weekly_menu_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_weekly_menus m
    WHERE m.id = user_weekly_menu_items.weekly_menu_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage all menu items"
ON public.user_weekly_menu_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix search_path for referral functions
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
    SELECT EXISTS(
      SELECT 1 FROM public.user_profiles WHERE referral_code = new_code
    ) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

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
  v_referral_exists boolean;
BEGIN
  SELECT id INTO v_referrer_id
  FROM public.user_profiles
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code de parrainage invalide');
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM public.user_referrals WHERE referred_user_id = p_new_user_id
  ) INTO v_referral_exists;
  
  IF v_referral_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Vous avez déjà utilisé un code de parrainage');
  END IF;
  
  INSERT INTO public.user_referrals (referrer_id, referred_user_id, status)
  VALUES (v_referrer_id, p_new_user_id, 'SIGNED_UP');
  
  INSERT INTO public.user_events (user_id, event_type, points_delta, credits_delta, meta)
  VALUES (v_referrer_id, 'REFERRAL_COMPLETED', 0, 10, jsonb_build_object('referred_user_id', p_new_user_id, 'referral_code', p_referral_code));
  
  RETURN jsonb_build_object('success', true, 'message', 'Parrainage enregistré avec succès', 'referrer_id', v_referrer_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_referrals_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_referrals
  WHERE referrer_id = p_user_id AND status = 'SIGNED_UP' AND referred_user_id IS NOT NULL;
$$;
-- Add affiliate program tables and columns

-- 1. Add affiliate fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_affiliate boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS affiliate_code text UNIQUE;

-- 2. Create affiliate_conversions table
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  stripe_subscription_id text NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.04,
  amount_recurring numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create affiliate_payouts table
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  period_start date,
  period_end date,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create daily_recipe_suggestions table
CREATE TABLE IF NOT EXISTS public.user_daily_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  lunch_recipe_id uuid,
  dinner_recipe_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- RLS Policies for affiliate_conversions
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own conversions"
ON public.affiliate_conversions
FOR SELECT
USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Service role can manage conversions"
ON public.affiliate_conversions
FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policies for affiliate_payouts
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own payouts"
ON public.affiliate_payouts
FOR SELECT
USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can manage payouts"
ON public.affiliate_payouts
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_daily_recipes
ALTER TABLE public.user_daily_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily recipes"
ON public.user_daily_recipes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily recipes"
ON public.user_daily_recipes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily recipes"
ON public.user_daily_recipes
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'AFF' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(
      SELECT 1 FROM public.user_profiles WHERE affiliate_code = new_code
    ) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Function to get daily recipe suggestions (deterministic per user/date)
CREATE OR REPLACE FUNCTION public.get_daily_recipe_suggestions(
  p_user_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_lunch_id uuid;
  v_dinner_id uuid;
  v_existing record;
  v_lunch_recipe record;
  v_dinner_recipe record;
  v_preferences record;
  v_seed numeric;
BEGIN
  -- Check if already suggested for this date
  SELECT * INTO v_existing
  FROM public.user_daily_recipes
  WHERE user_id = p_user_id AND date = p_date;
  
  IF FOUND THEN
    v_lunch_id := v_existing.lunch_recipe_id;
    v_dinner_id := v_existing.dinner_recipe_id;
  ELSE
    -- Get user preferences
    SELECT * INTO v_preferences
    FROM public.preferences
    WHERE user_id = p_user_id;
    
    -- Create deterministic seed from user_id + date
    v_seed := (extract(epoch from p_date)::bigint + ('x' || substring(p_user_id::text, 1, 8))::bit(32)::bigint) % 1000000;
    
    -- Select lunch recipe (meal_type suitable for lunch, or general)
    SELECT id INTO v_lunch_id
    FROM public.recipes
    WHERE published = true
      AND (meal_type IS NULL OR meal_type IN ('déjeuner', 'lunch', 'midi'))
      AND (v_preferences.type_alimentation IS NULL OR diet_type = v_preferences.type_alimentation OR diet_type IS NULL)
    ORDER BY md5(v_seed::text || id::text)
    LIMIT 1;
    
    -- Select dinner recipe (meal_type suitable for dinner, or general)
    SELECT id INTO v_dinner_id
    FROM public.recipes
    WHERE published = true
      AND (meal_type IS NULL OR meal_type IN ('dîner', 'dinner', 'soir'))
      AND id != v_lunch_id -- Don't suggest same recipe twice
      AND (v_preferences.type_alimentation IS NULL OR diet_type = v_preferences.type_alimentation OR diet_type IS NULL)
    ORDER BY md5((v_seed + 1)::text || id::text)
    LIMIT 1;
    
    -- Store suggestions
    INSERT INTO public.user_daily_recipes (user_id, date, lunch_recipe_id, dinner_recipe_id)
    VALUES (p_user_id, p_date, v_lunch_id, v_dinner_id)
    ON CONFLICT (user_id, date) DO UPDATE
    SET lunch_recipe_id = v_lunch_id,
        dinner_recipe_id = v_dinner_id;
  END IF;
  
  -- Fetch recipe details
  SELECT * INTO v_lunch_recipe
  FROM public.recipes
  WHERE id = v_lunch_id;
  
  SELECT * INTO v_dinner_recipe
  FROM public.recipes
  WHERE id = v_dinner_id;
  
  RETURN jsonb_build_object(
    'lunch', to_jsonb(v_lunch_recipe),
    'dinner', to_jsonb(v_dinner_recipe)
  );
END;
$$;
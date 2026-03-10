-- 1. user_profile
CREATE TABLE IF NOT EXISTS public.user_profile (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender          text,
  age             integer,
  height_cm       integer,
  current_weight  numeric(5,1),
  target_weight   numeric(5,1),
  weight_deadline text,
  activity_level  text,
  sport_frequency text,
  medical_conditions text[],
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their user_profile" ON public.user_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. user_objectives
CREATE TABLE IF NOT EXISTS public.user_objectives (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  main_goal       text,
  goal_duration   text,
  main_blockers   text[],
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE public.user_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their user_objectives" ON public.user_objectives
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. user_eating_habits
CREATE TABLE IF NOT EXISTS public.user_eating_habits (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  meals_per_day       integer,
  appetite_size       text,
  prep_time           text[],
  batch_cooking       text,
  cooking_level       text,
  cooking_frequency   text,
  available_tools     text[],
  meal_frequency      text,
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE public.user_eating_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their user_eating_habits" ON public.user_eating_habits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. user_meals_config
CREATE TABLE IF NOT EXISTS public.user_meals_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_type       text NOT NULL,
  meal_time       time,
  who_eats        text,
  who_eats_custom text[],
  portions        numeric(4,1),
  portions_manual boolean DEFAULT false,
  location        text,
  generate_recipe boolean DEFAULT true,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, meal_type)
);
ALTER TABLE public.user_meals_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their user_meals_config" ON public.user_meals_config
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. user_allergies
CREATE TABLE IF NOT EXISTS public.user_allergies (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  allergies           jsonb DEFAULT '[]'::jsonb,
  other_allergies     text,
  traces_accepted     boolean DEFAULT false,
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE public.user_allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their user_allergies" ON public.user_allergies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. user_food_style
CREATE TABLE IF NOT EXISTS public.user_food_style (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  diet_type           text,
  foods_to_avoid      text[],
  favorite_ingredients text[],
  favorite_cuisines   text[],
  spice_level         text,
  cooking_method      text,
  prefer_organic      boolean DEFAULT false,
  reduce_sugar        boolean DEFAULT false,
  gluten_free_pref    boolean DEFAULT false,
  prefer_seasonal     boolean DEFAULT false,
  bio_local           text,
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE public.user_food_style ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their user_food_style" ON public.user_food_style
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. user_nutrition_goals
CREATE TABLE IF NOT EXISTS public.user_nutrition_goals (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  caloric_goal        text,
  target_kcal         integer,
  protein_g_per_day   integer,
  macros_custom       boolean DEFAULT false,
  macro_protein_pct   integer DEFAULT 30,
  macro_carbs_pct     integer DEFAULT 45,
  macro_fat_pct       integer DEFAULT 25,
  dairy_preference    text,
  track_fiber         boolean DEFAULT false,
  portion_size        text,
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE public.user_nutrition_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their user_nutrition_goals" ON public.user_nutrition_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. user_household
CREATE TABLE IF NOT EXISTS public.user_household (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  adults_count        integer DEFAULT 1,
  children_count      integer DEFAULT 0,
  children_ages       integer[],
  total_portions      numeric(4,1),
  partner_absent_days integer DEFAULT 0,
  family_allergies    text,
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE public.user_household ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their user_household" ON public.user_household
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. user_lifestyle
CREATE TABLE IF NOT EXISTS public.user_lifestyle (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stress_level        text,
  sleep_hours         numeric(3,1),
  main_motivation     text,
  work_type           text,
  schedule_type       text,
  weekly_budget_food  text,
  shopping_frequency  text,
  shopping_location   text,
  sport_advice        boolean DEFAULT true,
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE public.user_lifestyle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their user_lifestyle" ON public.user_lifestyle
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-init rows for new users
CREATE OR REPLACE FUNCTION public.init_profile_tables()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profile (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_objectives (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_eating_habits (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_allergies (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_food_style (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_nutrition_goals (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_household (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_lifestyle (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_init_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_init_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.init_profile_tables();

-- Backfill existing users
INSERT INTO public.user_profile (user_id)
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_profile)
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_objectives (user_id)
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_objectives)
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_eating_habits (user_id)
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_eating_habits)
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_allergies (user_id)
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_allergies)
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_food_style (user_id)
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_food_style)
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_nutrition_goals (user_id)
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_nutrition_goals)
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_household (user_id)
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_household)
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_lifestyle (user_id)
  SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_lifestyle)
  ON CONFLICT DO NOTHING;
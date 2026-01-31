-- =====================================================
-- TASK 1: Credit Reset Runs Logging Table
-- =====================================================

-- Table to log each cron/manual execution of credit resets
CREATE TABLE IF NOT EXISTS public.credit_reset_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  summary jsonb DEFAULT '{}'::jsonb,
  error text,
  trigger text NOT NULL DEFAULT 'cron_hourly'
);

-- RLS for credit_reset_runs - only service role can insert/update
ALTER TABLE public.credit_reset_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage credit_reset_runs"
  ON public.credit_reset_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view credit_reset_runs"
  ON public.credit_reset_runs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- TASK 3: Grocery Lists Table
-- =====================================================

-- Table for persisted grocery lists tied to weekly menus
CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_menu_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT fk_grocery_lists_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS for grocery_lists - users own their data
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own grocery_lists"
  ON public.grocery_lists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage grocery_lists"
  ON public.grocery_lists
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_menu ON public.grocery_lists(user_id, weekly_menu_id);

-- =====================================================
-- TASK 4: Email Events Logging Table for Brevo
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  provider text NOT NULL DEFAULT 'brevo',
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'error')),
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for email_events
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own email events (optional for transparency)
CREATE POLICY "Users can view own email_events"
  ON public.email_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update
CREATE POLICY "Service role can manage email_events"
  ON public.email_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_email_events_user ON public.email_events(user_id, created_at DESC);

-- =====================================================
-- FUNCTION: Generate Grocery List from Weekly Menu
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_grocery_list(p_weekly_menu_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_items jsonb := '[]'::jsonb;
  v_aggregated jsonb;
BEGIN
  -- Get user_id from the menu
  SELECT user_id INTO v_user_id
  FROM user_weekly_menus
  WHERE menu_id = p_weekly_menu_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Menu not found: %', p_weekly_menu_id;
  END IF;

  -- Aggregate ingredients from all menu items with portion scaling
  WITH menu_recipes AS (
    SELECT 
      wmi.recipe_id,
      wmi.target_servings,
      wmi.scale_factor,
      COALESCE(wmi.scale_factor, 1.0) as portion_multiplier
    FROM user_weekly_menu_items wmi
    WHERE wmi.weekly_menu_id = p_weekly_menu_id
  ),
  recipe_ingredients AS (
    SELECT 
      ri.ingredient_name_norm as name_norm,
      ri.ingredient_name as display_name,
      ri.normalized_quantity,
      ri.canonical_unit as unit,
      mr.portion_multiplier,
      mr.recipe_id
    FROM menu_recipes mr
    JOIN recipe_ingredients ri ON ri.recipe_id = mr.recipe_id
    WHERE ri.ingredient_name IS NOT NULL
  ),
  aggregated AS (
    SELECT 
      COALESCE(name_norm, lower(display_name)) as ingredient_key,
      MIN(display_name) as name,
      SUM(COALESCE(normalized_quantity, 1) * portion_multiplier) as total_quantity,
      MIN(unit) as unit,
      array_agg(DISTINCT recipe_id) as recipe_sources,
      -- Get category from shopping_aisles if available
      (SELECT sa.aisle FROM shopping_aisles sa WHERE sa.name_norm = COALESCE(name_norm, lower(display_name)) LIMIT 1) as category
    FROM recipe_ingredients
    GROUP BY COALESCE(name_norm, lower(display_name))
    ORDER BY category NULLS LAST, MIN(display_name)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'ingredient_key', ingredient_key,
      'name', name,
      'quantity', ROUND(total_quantity::numeric, 1),
      'unit', COALESCE(unit, 'unité'),
      'recipe_sources', recipe_sources,
      'category', COALESCE(category, 'Divers'),
      'checked', false
    )
  ) INTO v_items
  FROM aggregated;

  -- Upsert into grocery_lists
  INSERT INTO grocery_lists (weekly_menu_id, user_id, items, generated_at)
  VALUES (p_weekly_menu_id, v_user_id, COALESCE(v_items, '[]'::jsonb), now())
  ON CONFLICT (weekly_menu_id) 
  DO UPDATE SET 
    items = COALESCE(v_items, '[]'::jsonb),
    generated_at = now();

  RETURN COALESCE(v_items, '[]'::jsonb);
END;
$$;

-- =====================================================
-- FUNCTION: Update Grocery List Item Checked State
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_grocery_item_checked(
  p_grocery_list_id uuid,
  p_ingredient_key text,
  p_checked boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_user_id
  FROM grocery_lists
  WHERE id = p_grocery_list_id AND user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update the specific item's checked status
  UPDATE grocery_lists
  SET items = (
    SELECT jsonb_agg(
      CASE 
        WHEN item->>'ingredient_key' = p_ingredient_key 
        THEN item || jsonb_build_object('checked', p_checked)
        ELSE item
      END
    )
    FROM jsonb_array_elements(items) as item
  )
  WHERE id = p_grocery_list_id;

  RETURN true;
END;
$$;
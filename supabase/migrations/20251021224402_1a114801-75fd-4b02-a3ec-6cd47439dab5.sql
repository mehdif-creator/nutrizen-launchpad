-- Fix Security Definer Views
-- Drop and recreate v_ri_qc view as SECURITY INVOKER
DROP VIEW IF EXISTS public.v_ri_qc;

CREATE VIEW public.v_ri_qc 
WITH (security_invoker = true)
AS
SELECT 
  ri.id AS ri_id,
  ri.recipe_id AS recipe_uuid,
  ri.ingredient_name,
  ri.ciqual_id,
  ri.quantity_g,
  cf.alim_nom_fr,
  cc.calories_kcal,
  CASE 
    WHEN ri.ciqual_id IS NULL THEN 'Missing CIQUAL mapping'
    WHEN cc.calories_kcal IS NULL OR cc.calories_kcal = 0 THEN 'Zero calorie ingredient'
    ELSE NULL
  END AS issue
FROM public.recipe_ingredients ri
LEFT JOIN public.ciqual_foods cf ON cf.alim_code::text = ri.ciqual_id::text
LEFT JOIN public.ciqual_core cc ON cc.alim_code::text = ri.ciqual_id::text;

COMMENT ON VIEW public.v_ri_qc IS 'Recipe ingredient quality check view - now uses SECURITY INVOKER for proper RLS enforcement';

-- Enable RLS on CIQUAL tables with read-only public access
ALTER TABLE public.ciqual_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciqual_core ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciqual_constituents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciqual_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciqual_groups ENABLE ROW LEVEL SECURITY;

-- Allow public read access to CIQUAL reference data
CREATE POLICY "Public read access" ON public.ciqual_foods
FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public.ciqual_core
FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public.ciqual_constituents
FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public.ciqual_compositions
FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public.ciqual_groups
FOR SELECT USING (true);

-- Restrict modifications to service role only
CREATE POLICY "Service role only modifications" ON public.ciqual_foods
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only modifications" ON public.ciqual_core
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only modifications" ON public.ciqual_constituents
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only modifications" ON public.ciqual_compositions
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only modifications" ON public.ciqual_groups
FOR ALL USING (auth.role() = 'service_role');

-- Fix remaining functions missing search_path
-- These are the functions that still need the search_path set
ALTER FUNCTION public.get_recipe_macros(bigint) SET search_path TO 'public';
ALTER FUNCTION public.guard_zero_kcal_mapping() SET search_path TO 'public';
ALTER FUNCTION public.backfill_recipes_with_progress(integer, integer) SET search_path TO 'public';
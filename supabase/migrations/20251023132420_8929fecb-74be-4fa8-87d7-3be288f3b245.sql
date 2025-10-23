-- Security Fix: Add fixed search_path to SECURITY DEFINER functions
-- This prevents search path injection vulnerabilities

ALTER FUNCTION public.init_dashboard_stats_for_new_user() SET search_path = public;
ALTER FUNCTION public.refresh_recipe_trigger() SET search_path = public;

-- Security Fix: Convert ciqual_full view to SECURITY INVOKER
-- This ensures the view executes with caller privileges, not creator privileges
DROP VIEW IF EXISTS public.ciqual_full CASCADE;

CREATE VIEW public.ciqual_full
WITH (security_invoker = true)
AS
SELECT 
  f.id,
  f.alim_code,
  f.alim_nom_fr,
  f.alim_nom_eng,
  f.alim_nom_index_fr,
  f.alim_grp_code,
  f.alim_ssgrp_code,
  f.alim_ssssgrp_code,
  -- Get energy from compositions
  CAST(
    (SELECT teneur FROM ciqual_compositions c 
     WHERE c.alim_code = f.alim_code 
     AND c.const_code = '328' LIMIT 1) AS NUMERIC
  ) AS energie_kcal_100g,
  -- Get proteins from compositions  
  CAST(
    (SELECT teneur FROM ciqual_compositions c 
     WHERE c.alim_code = f.alim_code 
     AND c.const_code = '25000' LIMIT 1) AS NUMERIC
  ) AS proteines_g_100g,
  -- Get glucides from compositions
  CAST(
    (SELECT teneur FROM ciqual_compositions c 
     WHERE c.alim_code = f.alim_code 
     AND c.const_code = '31000' LIMIT 1) AS NUMERIC
  ) AS glucides_g_100g,
  -- Get lipides from compositions
  CAST(
    (SELECT teneur FROM ciqual_compositions c 
     WHERE c.alim_code = f.alim_code 
     AND c.const_code = '40000' LIMIT 1) AS NUMERIC
  ) AS lipides_g_100g,
  -- Get fibers from compositions
  CAST(
    (SELECT teneur FROM ciqual_compositions c 
     WHERE c.alim_code = f.alim_code 
     AND c.const_code = '34100' LIMIT 1) AS NUMERIC
  ) AS fibres_alimentaires_g_100g
FROM ciqual_foods f;
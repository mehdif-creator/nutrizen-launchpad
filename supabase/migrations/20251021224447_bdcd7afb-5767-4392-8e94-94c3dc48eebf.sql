-- Fix remaining security issues

-- Drop and recreate ciqual_summary view as SECURITY INVOKER
DROP VIEW IF EXISTS public.ciqual_summary;

CREATE VIEW public.ciqual_summary
WITH (security_invoker = true)
AS
SELECT 
  f.alim_code,
  f.alim_nom_fr,
  g.alim_grp_nom_fr AS categorie,
  max(
    CASE
      WHEN ((c.const_code = ANY (ARRAY['328'::text, '333'::text])) AND (comp.teneur ~ '^[0-9]+([.,][0-9]+)?$'::text)) 
      THEN (replace(comp.teneur, ','::text, '.'::text))::numeric
      ELSE NULL::numeric
    END) AS calories_kcal,
  max(
    CASE
      WHEN ((c.const_nom_fr ~~* '%Protéines%'::text) AND (comp.teneur ~ '^[0-9]+([.,][0-9]+)?$'::text)) 
      THEN (replace(comp.teneur, ','::text, '.'::text))::numeric
      ELSE NULL::numeric
    END) AS proteins_g,
  max(
    CASE
      WHEN ((c.const_nom_fr ~~* '%Glucides%'::text) AND (comp.teneur ~ '^[0-9]+([.,][0-9]+)?$'::text)) 
      THEN (replace(comp.teneur, ','::text, '.'::text))::numeric
      ELSE NULL::numeric
    END) AS carbs_g,
  max(
    CASE
      WHEN ((c.const_nom_fr ~~* '%Lipides%'::text) AND (comp.teneur ~ '^[0-9]+([.,][0-9]+)?$'::text)) 
      THEN (replace(comp.teneur, ','::text, '.'::text))::numeric
      ELSE NULL::numeric
    END) AS fats_g,
  max(
    CASE
      WHEN ((c.const_nom_fr ~~* '%Fibres%'::text) AND (comp.teneur ~ '^[0-9]+([.,][0-9]+)?$'::text)) 
      THEN (replace(comp.teneur, ','::text, '.'::text))::numeric
      ELSE NULL::numeric
    END) AS fibers_g
FROM ciqual_compositions comp
JOIN ciqual_foods f ON f.alim_code = comp.alim_code
JOIN ciqual_constituents c ON c.const_code = comp.const_code
LEFT JOIN ciqual_groups g ON g.alim_grp_code = f.alim_grp_code::text
GROUP BY f.alim_code, f.alim_nom_fr, g.alim_grp_nom_fr;

COMMENT ON VIEW public.ciqual_summary IS 'Aggregated CIQUAL nutrition data - uses SECURITY INVOKER for proper RLS enforcement';

-- Fix remaining functions without search_path
-- Note: Some functions may already have search_path set from previous migrations
-- These ALTER statements will update or set them appropriately

ALTER FUNCTION public.create_referral_code_for_new_user() SET search_path TO 'public';
ALTER FUNCTION public.recipe_ingredients_after_change() SET search_path TO 'public';
ALTER FUNCTION public.set_updated_at() SET search_path TO 'public';
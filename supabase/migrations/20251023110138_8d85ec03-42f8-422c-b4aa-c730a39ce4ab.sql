-- Fix SECURITY DEFINER view issue by recreating ciqual_full with security_invoker
DROP VIEW IF EXISTS public.ciqual_full;

CREATE VIEW public.ciqual_full
WITH (security_invoker = true)
AS
SELECT f.id,
    f.alim_code,
    f.alim_nom_fr,
    f.alim_nom_eng,
    f.alim_grp_code,
    f.alim_ssgrp_code,
    f.alim_ssssgrp_code,
    f.alim_nom_index_fr,
    COALESCE(max(
        CASE
            WHEN cc.const_nom_fr ~~* '%energ%'::text THEN comp.teneur::numeric
            ELSE NULL::numeric
        END), 0::numeric) AS energie_kcal_100g,
    COALESCE(max(
        CASE
            WHEN cc.const_nom_fr ~~* '%prot%'::text THEN comp.teneur::numeric
            ELSE NULL::numeric
        END), 0::numeric) AS proteines_g_100g,
    COALESCE(max(
        CASE
            WHEN cc.const_nom_fr ~~* '%gluc%'::text THEN comp.teneur::numeric
            ELSE NULL::numeric
        END), 0::numeric) AS glucides_g_100g,
    COALESCE(max(
        CASE
            WHEN cc.const_nom_fr ~~* '%lipid%'::text OR cc.const_nom_fr ~~* '%lipid%'::text THEN comp.teneur::numeric
            ELSE NULL::numeric
        END), 0::numeric) AS lipides_g_100g,
    COALESCE(max(
        CASE
            WHEN cc.const_nom_fr ~~* '%fibr%'::text OR cc.const_nom_fr ~~* '%fibres%'::text THEN comp.teneur::numeric
            ELSE NULL::numeric
        END), 0::numeric) AS fibres_alimentaires_g_100g
FROM ciqual_foods f
LEFT JOIN ciqual_compositions comp ON comp.alim_code = f.alim_code
LEFT JOIN ciqual_constituents cc ON comp.const_code = cc.const_code
GROUP BY f.id, f.alim_code, f.alim_nom_fr;
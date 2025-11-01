-- ============================================================
-- Security Hardening: Fix Function Search Path Issues
-- ============================================================
-- This migration adds SET search_path to functions to prevent
-- search_path hijacking attacks (CVE-2018-1058 style)
-- ============================================================

-- Fix get_menu_household function
CREATE OR REPLACE FUNCTION public.get_menu_household(
  p_days integer,
  p_people jsonb,
  p_country text DEFAULT NULL::text,
  p_kcal_min numeric DEFAULT NULL::numeric,
  p_kcal_max numeric DEFAULT NULL::numeric,
  p_protein_min numeric DEFAULT NULL::numeric,
  p_exclude_ingrs text[] DEFAULT NULL::text[]
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
with factor as (
  select public.household_portion_factor(p_people) as servings
),
pool as (
  select r.id, r.title, r.country_code, r.meal_type,
         m.calories_kcal, m.proteins_g, m.carbs_g, m.fats_g
  from public.recipes r
  join public.recipe_macros_v m on m.recipe_id = r.id
  where
    (p_country is null or r.country_code = p_country)
    and (p_kcal_min   is null or m.calories_kcal >= p_kcal_min)
    and (p_kcal_max   is null or m.calories_kcal <= p_kcal_max)
    and (p_protein_min is null or m.proteins_g   >= p_protein_min)
    and (
      p_exclude_ingrs is null
      or not exists (
        select 1
        from public.recipe_ingredients ri
        where ri.recipe_id = r.id
          and public.normalize_str(ri.ingredient_name) = any (
            select public.normalize_str(x) from unnest(p_exclude_ingrs) x
          )
      )
    )
),
picked as (
  select * from pool
  order by meal_type, random()
  limit greatest(p_days, 1)
)
select jsonb_build_object(
  'days', p_days,
  'people', p_people,
  'servings_equiv', (select servings from factor),
  'recipes', coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id, 'title', title, 'country_code', country_code, 'meal_type', meal_type,
      'macros_per_serv', jsonb_build_object(
        'kcal', calories_kcal, 'prot', proteins_g, 'carbs', carbs_g, 'fats', fats_g
      ),
      'macros_total', jsonb_build_object(
        'kcal', calories_kcal * (select servings from factor),
        'prot', proteins_g   * (select servings from factor),
        'carbs', carbs_g     * (select servings from factor),
        'fats',  fats_g      * (select servings from factor)
      )
    )
  ), '[]'::jsonb)
) from picked;
$function$;

-- Fix household_portion_factor function
CREATE OR REPLACE FUNCTION public.household_portion_factor(p_people jsonb)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
select (
  coalesce( (p_people->>'adults')::int,       0) * 1.00 +
  coalesce( (p_people->>'teens')::int,        0) * 0.90 +
  coalesce( (p_people->>'child_6_11')::int,   0) * 0.70 +
  coalesce( (p_people->>'child_3_5')::int,    0) * 0.50 +
  coalesce( (p_people->>'toddler_1_2')::int,  0) * 0.35
)::numeric;
$function$;

-- Fix normalize_str function
CREATE OR REPLACE FUNCTION public.normalize_str(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  select trim(regexp_replace(lower(unaccent(coalesce(p,''))), '\s+', ' ', 'g'));
$function$;

-- Fix to_num function
CREATE OR REPLACE FUNCTION public.to_num(input_text text)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  cleaned_text text;
BEGIN
  -- 1. Remplacer les virgules par des points
  -- 2. Supprimer les espaces et les lettres/unités (sauf le point)
  cleaned_text := regexp_replace(
    replace(input_text, ',', '.'), 
    '[^0-9.]', 
    '', 
    'g'
  );

  -- Gérer les cas vides ou juste un point
  IF cleaned_text = '' OR cleaned_text = '.' THEN
    RETURN 0.0;
  END IF;

  RETURN cleaned_text::numeric;

EXCEPTION
  -- Retourne 0.0 si la conversion numérique finale échoue
  WHEN others THEN
    RETURN 0.0;
END;
$function$;

-- Fix trg_norm_ri_name trigger function
CREATE OR REPLACE FUNCTION public.trg_norm_ri_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.ingredient_name_norm := public.normalize_str(new.ingredient_name);
  return new;
end;
$function$;

-- ============================================================
-- End of migration
-- ============================================================
-- These changes prevent search_path manipulation attacks by
-- ensuring functions always use the 'public' schema
-- ============================================================
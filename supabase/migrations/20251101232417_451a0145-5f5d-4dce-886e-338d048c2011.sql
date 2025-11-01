-- Fix search_path vulnerabilities in SQL functions
-- This prevents search_path hijacking attacks (CVE-2018-1058)

-- 1. Fix get_menu_household function
CREATE OR REPLACE FUNCTION public.get_menu_household(
  p_days integer, 
  p_people jsonb, 
  p_country text DEFAULT NULL, 
  p_kcal_min numeric DEFAULT NULL, 
  p_kcal_max numeric DEFAULT NULL, 
  p_protein_min numeric DEFAULT NULL, 
  p_exclude_ingrs text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
with factor as (
  select public.household_portion_factor(p_people) as servings
),
/* 1) Pool filtré (inclut p_country si fourni) */
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
/* 2) Premier tirage dans pool (respecte p_country) */
picked as (
  select * from pool
  order by meal_type, random()
  limit greatest(p_days, 1)
),
/* 3) Fallback : si picked est vide, on tire dans TOUTES les recettes
      (mêmes contraintes macros/ingrédients, mais SANS filtre pays) */
pool_no_country as (
  select r.id, r.title, r.country_code, r.meal_type,
         m.calories_kcal, m.proteins_g, m.carbs_g, m.fats_g
  from public.recipes r
  join public.recipe_macros_v m on m.recipe_id = r.id
  where
    (p_kcal_min   is null or m.calories_kcal >= p_kcal_min)
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
picked_fallback as (
  -- Si picked a des lignes, on les garde.
  -- Sinon, on prend un tirage aléatoire depuis pool_no_country.
  select * from picked
  union all
  select * from (
    select * from pool_no_country
    where not exists (select 1 from picked)
    order by meal_type, random()
    limit greatest(p_days, 1)
  ) t
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
) from picked_fallback;
$function$;

-- 2. Fix get_shopping_list_from_menu function
CREATE OR REPLACE FUNCTION public.get_shopping_list_from_menu(
  p_menu jsonb,
  p_pantry text[] DEFAULT NULL,
  p_exclude text[] DEFAULT ARRAY[
    'sel','poivre','sucre','miel','vinaigre','huile','huile d''olive',
    'herbes de provence','curry','paprika','piment','cumin','curcuma',
    'origan','basilic','thym','romarin','ail en poudre','oignon en poudre',
    'vanille','levure','maïzena','fécule','cube bouillon','bouillon'
  ],
  p_min_qty_g int DEFAULT 20,
  p_round_g int DEFAULT 5
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
with
factor as (
  select coalesce( (p_menu->>'servings_equiv')::numeric, 1 ) as servings
),
menu_recipes as (
  select (x->>'id')::uuid as recipe_id
  from jsonb_array_elements(coalesce(p_menu->'recipes', '[]'::jsonb)) x
  where (x->>'id') is not null
),
ings as (
  select
    ri.recipe_id,
    ri.ingredient_name                           as raw_name,
    public.normalize_str(ri.ingredient_name)     as norm_name,
    case 
      when p_round_g <= 1 then (ri.quantity_g * (select servings from factor))::numeric
      else round((ri.quantity_g * (select servings from factor)) / p_round_g) * p_round_g
    end                                          as qty_g_scaled
  from public.recipe_ingredients ri
  join menu_recipes mr on mr.recipe_id = ri.recipe_id
),
filtered as (
  select *
  from ings
  where not (
    (p_pantry  is not null and public.normalize_str(raw_name) = any (select public.normalize_str(x) from unnest(p_pantry)  x))
    or (p_exclude is not null and public.normalize_str(raw_name) = any (select public.normalize_str(x) from unnest(p_exclude) x))
    or qty_g_scaled < p_min_qty_g
  )
),
ranked as (
  select
    norm_name,
    raw_name,
    count(*) as c
  from filtered
  group by norm_name, raw_name
),
topname as (
  select distinct on (norm_name)
    norm_name, raw_name as disp_name
  from ranked
  order by norm_name, c desc, raw_name asc
),
agg as (
  select
    f.norm_name,
    sum(f.qty_g_scaled)::numeric as total_g,
    t.disp_name
  from filtered f
  join topname t using (norm_name)
  group by f.norm_name, t.disp_name
)
select coalesce(jsonb_agg(
  jsonb_build_object(
    'name',       disp_name,
    'name_norm',  norm_name,
    'quantity_g', total_g
  )
  order by disp_name
), '[]'::jsonb)
from agg;
$function$;
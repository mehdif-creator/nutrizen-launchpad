-- Fix remaining function without SET search_path
CREATE OR REPLACE FUNCTION public.get_recipe_ingredients_household(
  p_recipe uuid,
  p_people jsonb,
  p_round_grams integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
with factor as (
  select public.household_portion_factor(p_people) as servings
),
ings as (
  select
    coalesce(ri.ingredient_name, '') as name,
    (ri.quantity_g)::numeric as qty_g_base,
    case when p_round_grams <= 1
         then (ri.quantity_g * (select servings from factor))::numeric
         else round((ri.quantity_g * (select servings from factor)) / p_round_grams) * p_round_grams
    end::numeric as qty_g_scaled
  from public.recipe_ingredients ri
  where ri.recipe_id = p_recipe
)
select jsonb_build_object(
  'recipe_id', p_recipe,
  'people', p_people,
  'servings_equiv', (select servings from factor),
  'ingredients', coalesce(jsonb_agg(
    jsonb_build_object('name', name, 'quantity_g', qty_g_scaled)
    order by name
  ), '[]'::jsonb)
) from ings;
$function$;
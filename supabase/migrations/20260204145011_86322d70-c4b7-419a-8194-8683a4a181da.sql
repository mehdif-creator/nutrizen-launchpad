-- Fix search_path for all functions missing it (security hardening)

CREATE OR REPLACE FUNCTION public.after_recipe_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
begin
  -- Queue macro calculation
  perform public.enqueue_recipe_macros_from_recipes();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.apply_n8n_macros()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
declare
  j jsonb;
  c numeric;
  p numeric;
  cb numeric;
  f numeric;
begin
  -- 1) Read macros_indicatives if present (as jsonb)
  begin
    if new.macros_indicatives is not null then
      j := new.macros_indicatives::jsonb;
    end if;
  exception when others then
    j := null;
  end;

  -- 2) Priority to numeric columns if already set
  c  := nullif(new.calories_kcal, 0);
  p  := nullif(new.proteins_g, 0);
  cb := nullif(new.carbs_g, 0);
  f  := nullif(new.fats_g, 0);

  -- 3) Fallback from macros_indicatives JSON
  if (c is null or p is null or cb is null or f is null) and j is not null then
    if c is null and (j ? 'calories') then
      c := nullif( (j->>'calories')::numeric, 0 );
    end if;
    if p is null and (j ? 'protein_g') then
      p := nullif( (j->>'protein_g')::numeric, 0 );
    end if;
    if cb is null and (j ? 'carbs_g') then
      cb := nullif( (j->>'carbs_g')::numeric, 0 );
    end if;
    if f is null and (j ? 'fat_g') then
      f := nullif( (j->>'fat_g')::numeric, 0 );
    end if;
  end if;

  -- 4) Apply to final columns
  if c is not null then new.calories_kcal := c; end if;
  if p is not null then new.proteins_g := p; end if;
  if cb is not null then new.carbs_g := cb; end if;
  if f is not null then new.fats_g := f; end if;

  -- 5) Set flag if we have calories + at least 1 macro
  if coalesce(new.calories_kcal,0) > 0
     and (coalesce(new.proteins_g,0) > 0 or coalesce(new.carbs_g,0) > 0 or coalesce(new.fats_g,0) > 0) then
    new.macros_calculated := true;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.force_lunch_meal_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
begin
  -- Only applies to generated recipes
  if (new.source_name = 'LLM' or new.source_uid like 'llm-%') then
    -- Force meal_type to lunch if empty or invalid
    if new.meal_type is null
       or lower(new.meal_type) in ('petit déjeuner','petit-dejeuner','petit-déjeuner','breakfast','brunch') then
      new.meal_type := 'déjeuner';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.lock_macros_if_set()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
begin
  if old.macros_calculated = true then
    -- Preserve existing macros if new value tries to reset to 0/null
    if coalesce(new.calories_kcal,0) = 0 then new.calories_kcal := old.calories_kcal; end if;
    if coalesce(new.proteins_g,0) = 0 then new.proteins_g := old.proteins_g; end if;
    if coalesce(new.carbs_g,0) = 0 then new.carbs_g := old.carbs_g; end if;
    if coalesce(new.fats_g,0) = 0 then new.fats_g := old.fats_g; end if;
    new.macros_calculated := true;
  end if;

  return new;
end;
$function$;
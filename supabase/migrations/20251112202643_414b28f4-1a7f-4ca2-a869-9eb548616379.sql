-- Fix search_path for generate_week_menu function
CREATE OR REPLACE FUNCTION public.generate_week_menu(p_user uuid, p_week_start date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_size int;
  v_menu_id uuid;
  rec record;
begin
  -- Get household size
  select coalesce(household_size, 1) into v_size
  from public.user_profiles
  where user_id = p_user;

  -- Create/retrieve idempotent menu
  insert into public.weekly_menus (user_id, week_start)
  values (p_user, p_week_start)
  on conflict (user_id, week_start) do update set updated_at = now()
  returning id into v_menu_id;

  -- Insert meals with scaling
  for rec in
    select r.id as recipe_id, r.base_servings
    from public.recipes r
    limit 14
  loop
    insert into public.menu_items (menu_id, recipe_id, target_servings, scale_factor)
    values (
      v_menu_id,
      rec.recipe_id,
      v_size,
      (v_size::numeric / greatest(rec.base_servings,1))
    )
    on conflict do nothing;
  end loop;

  return jsonb_build_object('menu_id', v_menu_id, 'household_size', v_size);
end;
$$;
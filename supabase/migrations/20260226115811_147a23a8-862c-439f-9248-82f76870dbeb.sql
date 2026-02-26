
-- ============================================================
-- FIX: fn_create_gamification_profile failing on user_profiles VIEW
-- user_profiles is a VIEW (not a table), ON CONFLICT doesn't work on views
-- Profile is already created by handle_new_user trigger, skip it here
-- Also wrap everything in exception blocks so signup never fails
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_create_gamification_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- Profile is already created by handle_new_user trigger
  -- Only create gamification-related rows here
  
  begin
    insert into public.user_wallets (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  exception when others then
    raise notice 'user_wallets init skipped: %', sqlerrm;
  end;
  
  begin
    insert into public.user_streaks (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  exception when others then
    raise notice 'user_streaks init skipped: %', sqlerrm;
  end;
  
  -- Generate referral code on profiles table (the real table)
  begin
    update public.profiles 
    set referral_code = public.generate_referral_code()
    where id = new.id and referral_code is null;
  exception when others then
    raise notice 'referral_code generation skipped: %', sqlerrm;
  end;
  
  return new;
end $function$;

-- Also fix init_user_stats: it's defined as RETURNS trigger but called
-- via perform init_user_stats(new.id) which is wrong.
-- Wrap user_points insert in handle_new_user's exception block instead.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- 1) profil minimal
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  -- 2) dashboard stats
  begin
    insert into public.user_dashboard_stats (
      user_id, temps_gagne, charge_mentale_pct, 
      serie_en_cours_set_count, credits_zen, references_count, objectif_hebdos_valide
    )
    values (new.id, 0, 0, 0, 10, 0, 0)
    on conflict (user_id) do nothing;
  exception when others then
    raise notice 'dashboard_stats skipped: %', sqlerrm;
  end;

  -- 3) gamification
  begin
    insert into public.user_gamification (
      user_id, points, level, streak_days, badges_count
    )
    values (new.id, 0, 1, 0, 0)
    on conflict (user_id) do nothing;
  exception when others then
    raise notice 'gamification skipped: %', sqlerrm;
  end;

  -- 4) user_points
  begin
    insert into public.user_points (
      user_id, total_points, current_level, login_streak,
      meals_completed, meals_generated, referrals
    )
    values (new.id, 0, 'Bronze', 0, 0, 0, 0)
    on conflict (user_id) do nothing;
  exception when others then
    raise notice 'user_points skipped: %', sqlerrm;
  end;

  return new;
end;
$function$;

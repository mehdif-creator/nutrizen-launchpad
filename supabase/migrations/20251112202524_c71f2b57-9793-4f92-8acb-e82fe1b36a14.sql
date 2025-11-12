-- Update fn_get_dashboard to use the new referral system
CREATE OR REPLACE FUNCTION public.fn_get_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user uuid := auth.uid();
  v_wallet public.user_wallets;
  v_streak public.user_streaks;
  v_profile public.user_profiles;
  v_badges jsonb;
  v_events jsonb;
  v_referral_count int;
begin
  if v_user is null then
    raise exception 'unauthorized';
  end if;

  -- Get wallet
  select * into v_wallet from public.user_wallets where user_id = v_user;
  if v_wallet is null then
    insert into public.user_wallets (user_id) values (v_user)
    returning * into v_wallet;
  end if;

  -- Get streak
  select * into v_streak from public.user_streaks where user_id = v_user;
  if v_streak is null then
    insert into public.user_streaks (user_id) values (v_user)
    returning * into v_streak;
  end if;

  -- Get profile
  select * into v_profile from public.user_profiles where id = v_user;

  -- Get badges
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'code', ub.badge_code,
      'grantedAt', ub.granted_at,
      'name', b.name,
      'description', b.description,
      'icon', b.icon
    ) order by ub.granted_at desc
  ), '[]'::jsonb)
  into v_badges
  from public.user_badges ub
  join public.badges b on b.code = ub.badge_code
  where ub.user_id = v_user;

  -- Get recent events
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'type', e.event_type,
      'points', e.points_delta,
      'credits', e.credits_delta,
      'at', e.occurred_at,
      'meta', e.meta
    ) order by e.occurred_at desc
  ), '[]'::jsonb)
  into v_events
  from public.user_events e
  where e.user_id = v_user
  limit 50;

  -- Get referral count using the dedicated function
  v_referral_count := public.get_active_referrals_count(v_user);

  return jsonb_build_object(
    'wallet', to_jsonb(v_wallet),
    'streak', to_jsonb(v_streak),
    'profile', to_jsonb(v_profile),
    'badges', v_badges,
    'recentEvents', v_events,
    'activeReferrals', v_referral_count
  );
end $$;
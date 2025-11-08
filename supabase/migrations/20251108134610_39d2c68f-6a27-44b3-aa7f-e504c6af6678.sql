-- ============================================
-- Dynamic Gamification System for NutriZen
-- ============================================
-- This migration creates a comprehensive gamification system with:
-- - Event-driven points/credits system
-- - Streak tracking with timezone support
-- - Badge management
-- - Credit expiry (6 months rolling)
-- - Weekly challenges
-- - Referral tracking

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- USER PROFILES (extends auth.users)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  referral_code text unique,
  show_on_leaderboard boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generate unique referral codes
create or replace function generate_referral_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := substring(encode(gen_random_bytes(8), 'hex') for 10);
    exit when not exists (select 1 from public.user_profiles where referral_code = code);
  end loop;
  return code;
end $$;

-- EVENTS LOG (immutable audit of all gamification actions)
create type public.gamification_event as enum (
  'APP_OPEN', 'MEAL_VALIDATED', 'DAY_COMPLETED',
  'WEEKLY_CHALLENGE_COMPLETED', 'SOCIAL_SHARE',
  'POINTS_REDEEMED_TO_CREDITS', 'CREDITS_SPENT',
  'STREAK_MILESTONE', 'REFERRAL_GRANTED', 'REFERRAL_GOAL_REACHED',
  'BADGE_GRANTED', 'ADMIN_ADJUST'
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type public.gamification_event not null,
  meta jsonb not null default '{}',
  points_delta integer not null default 0,
  credits_delta integer not null default 0,
  occurred_at timestamptz not null default now()
);

create index idx_user_events_user_occurred on public.user_events(user_id, occurred_at desc);
create index idx_user_events_type on public.user_events(event_type);
create index idx_user_events_occurred on public.user_events(occurred_at desc);

-- WALLET / TALLIES (current balances)
create table if not exists public.user_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points_total integer not null default 0 check (points_total >= 0),
  credits_total integer not null default 0 check (credits_total >= 0),
  lifetime_points integer not null default 0,
  lifetime_credits_earned integer not null default 0,
  updated_at timestamptz not null default now()
);

-- CREDITS EXPIRY (per grant, FIFO consumption)
create table if not exists public.user_credit_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null check (credits >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed integer not null default 0 check (consumed >= 0 and consumed <= credits)
);

create index idx_credit_lots_user_expires on public.user_credit_lots(user_id, expires_at);

-- STREAKS (timezone-aware: Europe/Paris)
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak_days integer not null default 0 check (current_streak_days >= 0),
  longest_streak_days integer not null default 0 check (longest_streak_days >= 0),
  last_active_date date,
  updated_at timestamptz not null default now()
);

-- BADGES (predefined achievements)
create table if not exists public.badges (
  code text primary key,
  name text not null,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

-- Seed badges
insert into public.badges(code, name, description, icon) values
  ('DISCIPLINE_GOLD', 'Discipline Gold', '30-day streak achieved', '🔥'),
  ('FAST_COOK', 'Fast Cook', '10 recipes under 15 minutes', '⚡'),
  ('ZERO_WASTE', 'Zero Waste', '3 weeks full menu completion', '♻️'),
  ('VIRAL_SHARER', 'Viral Sharer', '10 social shares', '📣'),
  ('MENTOR_ZEN', 'Mentor Zen', '5 active referrals', '🧑‍🏫')
on conflict (code) do nothing;

-- USER BADGES (earned achievements)
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_code text not null references public.badges(code),
  granted_at timestamptz not null default now(),
  unique (user_id, badge_code)
);

create index idx_user_badges_user on public.user_badges(user_id);

-- REFERRALS (tracking referral program)
create table if not exists public.user_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid unique references auth.users(id) on delete set null,
  referred_email text,
  status text not null check (status in ('CLICKED','SIGNED_UP','SUBSCRIBED')) default 'CLICKED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_user_referrals_referrer_status on public.user_referrals(referrer_id, status);

-- WEEKLY CHALLENGES (rotating weekly goals)
create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  code text not null,
  title text not null,
  description text,
  points_reward integer not null default 25,
  created_at timestamptz not null default now()
);

create index idx_weekly_challenges_week on public.weekly_challenges(week_start desc);

create table if not exists public.user_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.weekly_challenges(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create index idx_challenge_completions_user on public.user_challenge_completions(user_id);

-- Enable RLS on all tables
alter table public.user_profiles enable row level security;
alter table public.user_wallets enable row level security;
alter table public.user_credit_lots enable row level security;
alter table public.user_streaks enable row level security;
alter table public.user_events enable row level security;
alter table public.user_badges enable row level security;
alter table public.badges enable row level security;
alter table public.user_referrals enable row level security;
alter table public.weekly_challenges enable row level security;
alter table public.user_challenge_completions enable row level security;

-- RLS POLICIES

-- user_profiles
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- user_wallets
create policy "Users can view own wallet"
  on public.user_wallets for select
  using (auth.uid() = user_id);

create policy "System can manage wallets"
  on public.user_wallets for all
  using (true)
  with check (true);

-- user_streaks
create policy "Users can view own streaks"
  on public.user_streaks for select
  using (auth.uid() = user_id);

-- user_events
create policy "Users can view own events"
  on public.user_events for select
  using (auth.uid() = user_id);

-- user_badges
create policy "Users can view own badges"
  on public.user_badges for select
  using (auth.uid() = user_id);

-- badges (public read)
create policy "Anyone can view badges"
  on public.badges for select
  using (true);

-- user_credit_lots
create policy "Users can view own credit lots"
  on public.user_credit_lots for select
  using (auth.uid() = user_id);

-- user_referrals
create policy "Users can view own referrals"
  on public.user_referrals for select
  using (auth.uid() = referrer_id);

-- weekly_challenges (public read)
create policy "Anyone can view challenges"
  on public.weekly_challenges for select
  using (true);

-- user_challenge_completions
create policy "Users can view own completions"
  on public.user_challenge_completions for select
  using (auth.uid() = user_id);

-- ============================================
-- RPC FUNCTIONS (Core Gamification Logic)
-- ============================================

-- Award points/credits for an event
create or replace function public.fn_award_event(
  p_event_type public.gamification_event,
  p_points int,
  p_credits int,
  p_meta jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'unauthorized';
  end if;

  -- Log the event
  insert into public.user_events (user_id, event_type, meta, points_delta, credits_delta)
  values (v_user, p_event_type, p_meta, coalesce(p_points,0), coalesce(p_credits,0));

  -- Initialize wallet if needed
  insert into public.user_wallets (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  -- Update wallet
  update public.user_wallets
  set points_total = greatest(0, points_total + coalesce(p_points,0)),
      credits_total = greatest(0, credits_total + coalesce(p_credits,0)),
      lifetime_points = lifetime_points + greatest(0, coalesce(p_points,0)),
      lifetime_credits_earned = lifetime_credits_earned + greatest(0, coalesce(p_credits,0)),
      updated_at = now()
  where user_id = v_user;

  -- Add credits to lots if positive
  if coalesce(p_credits, 0) > 0 then
    insert into public.user_credit_lots (user_id, credits, expires_at)
    values (v_user, p_credits, now() + interval '6 months');
  end if;
end $$;

-- Consume credits (FIFO from oldest lots)
create or replace function public.fn_consume_credit(
  p_count int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_remaining int := p_count;
  r record;
begin
  if v_user is null or p_count <= 0 then
    return false;
  end if;

  -- Check sufficient credits
  if (select credits_total from public.user_wallets where user_id = v_user) < p_count then
    raise exception 'insufficient_credits';
  end if;

  -- Consume from lots (FIFO)
  for r in
    select * from public.user_credit_lots
    where user_id = v_user 
      and (credits - consumed) > 0 
      and expires_at > now()
    order by expires_at asc
    for update
  loop
    if v_remaining = 0 then exit; end if;
    
    declare
      v_take int := least(v_remaining, r.credits - r.consumed);
    begin
      update public.user_credit_lots
      set consumed = consumed + v_take
      where id = r.id;
      
      v_remaining := v_remaining - v_take;
    end;
  end loop;

  if v_remaining > 0 then
    raise exception 'insufficient_credits';
  end if;

  -- Update wallet
  update public.user_wallets
  set credits_total = greatest(0, credits_total - p_count),
      updated_at = now()
  where user_id = v_user;

  -- Log event
  perform public.fn_award_event('CREDITS_SPENT', 0, -p_count, 
    jsonb_build_object('count', p_count));

  return true;
end $$;

-- Convert points to credits (100 pts = 10 credits)
create or replace function public.fn_points_to_credits(
  p_points int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_credits int := (p_points / 100) * 10;
  v_current_points int;
begin
  if v_user is null or p_points < 100 or v_credits <= 0 then
    return false;
  end if;

  -- Check sufficient points
  select points_total into v_current_points
  from public.user_wallets
  where user_id = v_user;

  if v_current_points < p_points then
    return false;
  end if;

  -- Deduct points, add credits
  update public.user_wallets
  set points_total = points_total - p_points,
      credits_total = credits_total + v_credits,
      lifetime_credits_earned = lifetime_credits_earned + v_credits,
      updated_at = now()
  where user_id = v_user;

  -- Add to credit lots
  insert into public.user_credit_lots (user_id, credits, expires_at)
  values (v_user, v_credits, now() + interval '6 months');

  -- Log event
  perform public.fn_award_event('POINTS_REDEEMED_TO_CREDITS', -p_points, v_credits,
    jsonb_build_object('rate', '100->10'));

  return true;
end $$;

-- Update streak (call when user validates a meal)
create or replace function public.fn_touch_streak_today()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_yesterday date := ((now() at time zone 'Europe/Paris')::date - 1);
  v_row public.user_streaks;
begin
  if v_user is null then
    raise exception 'unauthorized';
  end if;

  -- Initialize streak if needed
  insert into public.user_streaks (user_id, current_streak_days, longest_streak_days, last_active_date)
  values (v_user, 1, 1, v_today)
  on conflict (user_id) do nothing;

  -- Lock and get streak
  select * into v_row
  from public.user_streaks
  where user_id = v_user
  for update;

  -- Already counted today
  if v_row.last_active_date = v_today then
    return;
  end if;

  -- Update streak
  if v_row.last_active_date = v_yesterday then
    v_row.current_streak_days := v_row.current_streak_days + 1;
  else
    v_row.current_streak_days := 1;
  end if;

  -- Update longest
  if v_row.current_streak_days > v_row.longest_streak_days then
    v_row.longest_streak_days := v_row.current_streak_days;
  end if;

  -- Save
  update public.user_streaks
  set current_streak_days = v_row.current_streak_days,
      longest_streak_days = v_row.longest_streak_days,
      last_active_date = v_today,
      updated_at = now()
  where user_id = v_user;

  -- Milestone rewards
  if v_row.current_streak_days = 7 then
    perform public.fn_award_event('STREAK_MILESTONE', 0, 1, 
      jsonb_build_object('days', 7));
  end if;

  if v_row.current_streak_days = 30 then
    -- Grant badge
    insert into public.user_badges (user_id, badge_code)
    values (v_user, 'DISCIPLINE_GOLD')
    on conflict do nothing;
    
    perform public.fn_award_event('BADGE_GRANTED', 10, 0,
      jsonb_build_object('badge', 'DISCIPLINE_GOLD'));
  end if;
end $$;

-- Get complete dashboard data (single query)
create or replace function public.fn_get_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  -- Get referral count
  select count(*) into v_referral_count
  from public.user_referrals
  where referrer_id = v_user and status = 'SUBSCRIBED';

  return jsonb_build_object(
    'wallet', to_jsonb(v_wallet),
    'streak', to_jsonb(v_streak),
    'profile', to_jsonb(v_profile),
    'badges', v_badges,
    'recentEvents', v_events,
    'activeReferrals', v_referral_count
  );
end $$;

-- Auto-create profile with referral code on user creation
create or replace function public.fn_create_gamification_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, referral_code)
  values (new.id, generate_referral_code())
  on conflict (id) do nothing;
  
  insert into public.user_wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  
  insert into public.user_streaks (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  
  return new;
end $$;

-- Trigger on user creation
drop trigger if exists on_auth_user_created_gamification on auth.users;
create trigger on_auth_user_created_gamification
  after insert on auth.users
  for each row
  execute function public.fn_create_gamification_profile();

-- Seed weekly challenges for current and next 3 weeks
do $$
declare
  v_monday date := date_trunc('week', now() at time zone 'Europe/Paris')::date;
begin
  insert into public.weekly_challenges (week_start, code, title, description, points_reward)
  values
    (v_monday, 'NO_ULTRA_PROCESSED', 'Zéro ultra-transformé', 'Aucun produit ultra-transformé cette semaine', 25),
    (v_monday + 7, 'VEGGIE_WEEK', 'Semaine végétale', 'Au moins 4 repas végétariens', 25),
    (v_monday + 14, 'BATCH_MASTER', 'Maître du batch', 'Préparer 3 batch cooking', 25),
    (v_monday + 21, 'LOCAL_HERO', 'Héros local', 'Seulement produits locaux et de saison', 25)
  on conflict (week_start) do nothing;
end $$;

-- Clean up expired credits (scheduled job helper)
create or replace function public.fn_cleanup_expired_credits()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_credit_lots
  where expires_at < now() and consumed >= credits;
end $$;
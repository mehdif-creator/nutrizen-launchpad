-- Create enum for user roles
create type public.app_role as enum ('admin', 'moderator', 'user');

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  locale text default 'fr',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Create preferences table
create table if not exists public.preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  objectifs text[],
  budget text,
  temps text,
  allergies text[],
  personnes int default 1,
  updated_at timestamptz default now()
);

-- Create recipes table
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tags text[],
  cover_url text,
  ingredients jsonb,
  steps jsonb,
  macros_indicatives jsonb,
  published boolean default true,
  created_at timestamptz default now()
);

-- Create meal_plans table
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_of date not null,
  items jsonb not null,
  created_at timestamptz default now()
);

-- Create meal_ratings table
create table if not exists public.meal_ratings (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid references public.meal_plans(id) on delete cascade not null,
  day int not null,
  stars int check (stars between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

-- Create swaps table
create table if not exists public.swaps (
  user_id uuid references public.profiles(id) on delete cascade,
  month date not null,
  quota int default 10,
  used int default 0,
  primary key(user_id, month)
);

-- Create subscriptions table
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null,
  plan text,
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create support_tickets table
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null,
  status text default 'open',
  messages jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create blog_posts table
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  cover_url text,
  tags text[],
  published_at timestamptz,
  author text,
  created_at timestamptz default now()
);

-- Create feature_flags table
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean default false,
  description text
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.preferences enable row level security;
alter table public.recipes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_ratings enable row level security;
alter table public.swaps enable row level security;
alter table public.subscriptions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.blog_posts enable row level security;
alter table public.feature_flags enable row level security;

-- Create security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- RLS Policies for user_roles
create policy "Users can view own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can manage all roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for preferences
create policy "Users can manage own preferences"
  on public.preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policies for recipes (public read)
create policy "Anyone can view published recipes"
  on public.recipes for select
  using (published = true);

create policy "Admins can manage recipes"
  on public.recipes for all
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for meal_plans
create policy "Users can manage own meal plans"
  on public.meal_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policies for meal_ratings
create policy "Users can rate own meal plans"
  on public.meal_ratings for all
  using (
    exists (
      select 1 from public.meal_plans p 
      where p.id = meal_plan_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meal_plans p 
      where p.id = meal_plan_id and p.user_id = auth.uid()
    )
  );

-- RLS Policies for swaps
create policy "Users can manage own swaps"
  on public.swaps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policies for subscriptions
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can update own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can insert own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

-- RLS Policies for support_tickets
create policy "Users can manage own tickets"
  on public.support_tickets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all tickets"
  on public.support_tickets for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update all tickets"
  on public.support_tickets for update
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for blog_posts (public read)
create policy "Anyone can view published blog posts"
  on public.blog_posts for select
  using (published_at is not null and published_at <= now());

create policy "Admins can manage blog posts"
  on public.blog_posts for all
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for feature_flags
create policy "Anyone can view feature flags"
  on public.feature_flags for select
  using (true);

create policy "Admins can manage feature flags"
  on public.feature_flags for all
  using (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert profile
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  
  -- Insert default preferences
  insert into public.preferences (user_id, objectifs, budget, temps, personnes)
  values (new.id, array['equilibre'], 'moyen', 'rapide', 1);
  
  -- Insert default subscription (trial)
  insert into public.subscriptions (user_id, status, plan, trial_start, trial_end)
  values (
    new.id,
    'trialing',
    null,
    now(),
    now() + interval '7 days'
  );
  
  -- Insert default user role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

-- Trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_preferences_updated_at
  before update on public.preferences
  for each row execute function public.update_updated_at_column();

create trigger update_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at_column();

create trigger update_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.update_updated_at_column();
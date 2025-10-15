-- Fix search_path for all functions
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

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
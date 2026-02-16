
-- 1) Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 3) Policy: authenticated users can read their own row only
CREATE POLICY "Users can check own admin status"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) Backfill the 3 admin accounts
INSERT INTO public.admin_users (user_id, email)
SELECT id, lower(email)
FROM auth.users
WHERE lower(email) IN (
  'mouldi493@gmail.com',
  'contact.mehdif@gmail.com',
  'appnutrizen@gmail.com'
)
ON CONFLICT (user_id) DO NOTHING;

-- 5) Create deterministic is_admin() RPC
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

-- 6) Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Fix admin role for a specific user
-- USAGE: Replace 'admin@example.com' with the actual email before running.
-- NEVER commit real emails to this file.

-- Add admin role by email
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@example.com' -- ← REPLACE with real email before running
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the admin roles (replace emails as needed)
SELECT u.id, u.email, ur.role 
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY u.email, ur.role;

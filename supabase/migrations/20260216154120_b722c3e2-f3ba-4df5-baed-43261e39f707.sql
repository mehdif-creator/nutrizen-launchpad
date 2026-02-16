INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email IN (
  'mouldi493@gmail.com',
  'contact.mehdif@gmail.com',
  'appnutrizen@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;
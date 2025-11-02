-- Fix admin role for appnutrizen@gmail.com user
-- This script adds the admin role to the user who is missing it

-- Add admin role to appnutrizen@gmail.com
INSERT INTO public.user_roles (user_id, role) 
VALUES ('55866f59-de43-4cdf-b5a0-59165de6cbc5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the admin roles
SELECT u.id, u.email, ur.role 
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN ('appnutrizen@gmail.com', 'mouldi493@gmail.com', 'contact.mehdif@gmail.com')
ORDER BY u.email, ur.role;

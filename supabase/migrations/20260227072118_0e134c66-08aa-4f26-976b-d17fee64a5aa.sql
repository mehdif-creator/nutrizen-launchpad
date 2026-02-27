-- Add missing admin role for mouldi493@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('4f3af04c-73ee-4667-8beb-b76240a91337', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

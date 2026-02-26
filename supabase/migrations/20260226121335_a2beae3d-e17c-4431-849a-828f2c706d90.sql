INSERT INTO public.user_roles (user_id, role)
VALUES ('844b4717-68c3-4378-b09b-c0eb1e373ced', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
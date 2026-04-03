INSERT INTO public.user_roles (user_id, role)
VALUES ('c6661a0b-5aeb-45b6-a358-493eddbae977', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
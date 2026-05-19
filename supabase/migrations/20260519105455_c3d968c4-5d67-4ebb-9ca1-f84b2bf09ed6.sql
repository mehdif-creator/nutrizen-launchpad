
-- 1. Lock down user_dashboard_stats: remove user-facing write policies
DROP POLICY IF EXISTS "Users can manage own dashboard stats" ON public.user_dashboard_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_dashboard_stats;
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_dashboard_stats;
-- Keep "Users can view own dashboard stats" (SELECT, authenticated), service_role manage, and auth_admin insert.

-- 2. Storage buckets: add explicit admin-only INSERT/UPDATE + service_role INSERT for recipe-images and social-images
CREATE POLICY "Admin insert recipe-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin update recipe-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role insert recipe-images"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'recipe-images');

CREATE POLICY "Admin insert social-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin update social-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'social-images' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'social-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role insert social-images"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'social-images');

-- 3. Realtime publication: remove tables that have no subscribed channel topic.
--    These tables broadcast change events but no client channel pattern is
--    authorized for them in realtime.messages — drop them from the publication
--    to prevent unauthorized broadcast reception.
ALTER PUBLICATION supabase_realtime DROP TABLE public.meal_plans;
ALTER PUBLICATION supabase_realtime DROP TABLE public.meal_ratings;
ALTER PUBLICATION supabase_realtime DROP TABLE public.grocery_lists;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_weekly_menu_items;

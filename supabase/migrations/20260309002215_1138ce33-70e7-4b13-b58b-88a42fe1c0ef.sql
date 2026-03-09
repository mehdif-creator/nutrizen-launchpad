-- Publier les tables utilisées par /admin/dashboard pour recevoir les évènements Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;
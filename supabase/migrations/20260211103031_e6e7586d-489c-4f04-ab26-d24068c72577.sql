-- Add critical tables to Supabase Realtime publication so subscriptions actually fire
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_dashboard_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gamification;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_daily_recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_weekly_menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_lists;
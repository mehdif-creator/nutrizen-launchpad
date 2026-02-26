
-- ============================================================
-- FULL USER RESET: Delete all user data and auth users
-- ============================================================

-- 1. Delete from tables with FK dependencies first
DELETE FROM public.meal_ratings;
DELETE FROM public.meal_plans;
DELETE FROM public.user_weekly_menus;
DELETE FROM public.grocery_lists;
DELETE FROM public.menu_generation_jobs;
DELETE FROM public.menu_generation_audit;
DELETE FROM public.menu_safety_reports;
DELETE FROM public.gamification_events;
DELETE FROM public.credit_transactions;
DELETE FROM public.credit_resets_log;
DELETE FROM public.credit_reset_runs;
DELETE FROM public.ingredient_substitutions_cache;
DELETE FROM public.diagnostics_results;
DELETE FROM public.diagnostics_runs;
DELETE FROM public.health_checks;
DELETE FROM public.admin_audit_log;
DELETE FROM public.email_events;
DELETE FROM public.payment_events_log;
DELETE FROM public.processed_checkout_sessions;
DELETE FROM public.checkout_tokens;
DELETE FROM public.login_tokens;
DELETE FROM public.affiliate_conversions;
DELETE FROM public.affiliate_payouts;
DELETE FROM public.automation_jobs;
DELETE FROM public.swaps;
DELETE FROM public.user_gamification;
DELETE FROM public.user_dashboard_stats;
DELETE FROM public.user_points;
DELETE FROM public.subscriptions;
DELETE FROM public.user_roles;
DELETE FROM public.preferences;
DELETE FROM public.profiles;

-- 2. Delete all auth users (cascades handled by ON DELETE CASCADE)
DELETE FROM auth.users;

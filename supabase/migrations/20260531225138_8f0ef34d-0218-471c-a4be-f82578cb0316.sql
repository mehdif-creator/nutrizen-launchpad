
ALTER TABLE public.user_dashboard_stats
  DROP CONSTRAINT IF EXISTS user_dashboard_stats_user_id_fkey,
  ADD CONSTRAINT user_dashboard_stats_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.seo_articles
  DROP CONSTRAINT IF EXISTS seo_articles_created_by_fkey,
  ADD CONSTRAINT seo_articles_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

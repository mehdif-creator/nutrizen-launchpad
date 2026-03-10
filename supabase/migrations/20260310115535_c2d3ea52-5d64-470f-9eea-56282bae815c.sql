
-- Article queue table for batch SEO article processing
CREATE TABLE public.article_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  target_keyword text,
  status text NOT NULL DEFAULT 'pending',
  priority integer DEFAULT 5,
  category text,
  error_message text,
  article_id uuid REFERENCES public.seo_articles(id),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.article_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using has_role function pattern
CREATE POLICY "Admins can select article_queue"
  ON public.article_queue FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can insert article_queue"
  ON public.article_queue FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update article_queue"
  ON public.article_queue FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can delete article_queue"
  ON public.article_queue FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Index for queue processing order
CREATE INDEX idx_article_queue_pending ON public.article_queue (priority ASC, created_at ASC) WHERE status = 'pending';

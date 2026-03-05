
-- Create the handle_updated_at function first
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SEO Factory pipeline state table
CREATE TABLE public.seo_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  cluster_context text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','serp_done','brief_done','outline_done','images_done','draft_done','qa_done','published','failed')),
  serp_snapshot jsonb,
  paa_questions text[],
  related_keywords text[],
  brief jsonb,
  outline jsonb,
  image_urls jsonb,
  draft_html text,
  draft_meta jsonb,
  cta_blocks jsonb,
  schema_json jsonb,
  quality_flags jsonb,
  qa_result jsonb,
  qa_score integer,
  qa_pass boolean,
  improve_attempts integer DEFAULT 0,
  blog_post_id uuid REFERENCES public.blog_posts(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  error_message text
);

CREATE INDEX idx_seo_articles_status ON public.seo_articles(status);
CREATE INDEX idx_seo_articles_keyword ON public.seo_articles(keyword);

ALTER TABLE public.seo_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on seo_articles"
  ON public.seo_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_seo_articles_updated_at
  BEFORE UPDATE ON public.seo_articles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Allow anyone (anon + authenticated) to read published seo_articles
CREATE POLICY "Public can read published seo_articles"
  ON public.seo_articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');
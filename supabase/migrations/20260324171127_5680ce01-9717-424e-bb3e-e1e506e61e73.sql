-- Add website_url column if not exists
ALTER TABLE public.manual_social_posts
ADD COLUMN IF NOT EXISTS website_url text DEFAULT 'https://mynutrizen.fr/';

-- Backfill existing rows
UPDATE public.manual_social_posts
SET website_url = 'https://mynutrizen.fr/'
WHERE website_url IS NULL;

-- RLS policies for admin-only access
ALTER TABLE public.manual_social_posts ENABLE ROW LEVEL SECURITY;

-- Admin select policy
CREATE POLICY "Admins can view manual_social_posts"
ON public.manual_social_posts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin insert policy
CREATE POLICY "Admins can insert manual_social_posts"
ON public.manual_social_posts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin update policy
CREATE POLICY "Admins can update manual_social_posts"
ON public.manual_social_posts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin delete policy
CREATE POLICY "Admins can delete manual_social_posts"
ON public.manual_social_posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
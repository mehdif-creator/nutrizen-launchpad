-- Enable RLS on recipe_macros_store
ALTER TABLE public.recipe_macros_store ENABLE ROW LEVEL SECURITY;

-- Allow public read access (macros are not user-specific)
CREATE POLICY "Public read access for recipe macros store"
ON public.recipe_macros_store
FOR SELECT
USING (true);

-- Only service role can modify
CREATE POLICY "Service role can manage recipe macros store"
ON public.recipe_macros_store
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable RLS on recipe_macros_queue
ALTER TABLE public.recipe_macros_queue ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can read queue
CREATE POLICY "Admins can view macros queue"
ON public.recipe_macros_queue
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only service role can modify queue
CREATE POLICY "Service role can manage macros queue"
ON public.recipe_macros_queue
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
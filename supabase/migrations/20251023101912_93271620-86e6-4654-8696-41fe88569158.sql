-- Enable RLS on user_dashboard_stats and add policies
ALTER TABLE public.user_dashboard_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own stats
CREATE POLICY "Users can view their own stats"
  ON public.user_dashboard_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own stats
CREATE POLICY "Users can insert their own stats"
  ON public.user_dashboard_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stats
CREATE POLICY "Users can update their own stats"
  ON public.user_dashboard_stats
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all stats
CREATE POLICY "Service role can manage all stats"
  ON public.user_dashboard_stats
  FOR ALL
  USING (auth.role() = 'service_role');

-- Fix search_path for the update function
DROP FUNCTION IF EXISTS public.update_user_weekly_menus_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_user_weekly_menus_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_user_weekly_menus_updated_at
  BEFORE UPDATE ON public.user_weekly_menus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_weekly_menus_updated_at();
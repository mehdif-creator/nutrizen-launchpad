-- Enable realtime for user_weekly_menus
ALTER TABLE public.user_weekly_menus REPLICA IDENTITY FULL;

-- Add to realtime publication if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'user_weekly_menus'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_weekly_menus;
  END IF;
END $$;
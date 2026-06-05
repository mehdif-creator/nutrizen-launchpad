
-- 1) BEFORE trigger: reset sync status when email changes
CREATE OR REPLACE FUNCTION public.marketing_contacts_reset_on_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.brevo_sync_status := 'pending';
    NEW.brevo_last_error := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_contacts_email_change ON public.marketing_contacts;
CREATE TRIGGER trg_marketing_contacts_email_change
BEFORE UPDATE ON public.marketing_contacts
FOR EACH ROW EXECUTE FUNCTION public.marketing_contacts_reset_on_email_change();

-- 2) AFTER trigger: fire pg_net call to auto-sync edge function
CREATE OR REPLACE FUNCTION public.marketing_contacts_notify_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/marketing-contacts-auto-sync';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU';
  v_should boolean := false;
BEGIN
  -- Only fire when there is something to sync
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_should := true;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.email IS DISTINCT FROM OLD.email
       OR NEW.marketing_opt_in IS DISTINCT FROM OLD.marketing_opt_in
       OR (NEW.brevo_sync_status = 'pending' AND OLD.brevo_sync_status IS DISTINCT FROM 'pending') THEN
      v_should := true;
    END IF;
  END IF;

  IF v_should THEN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', v_anon,
        'Authorization', 'Bearer ' || v_anon
      ),
      body := jsonb_build_object('action', 'single', 'user_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_contacts_auto_sync ON public.marketing_contacts;
CREATE TRIGGER trg_marketing_contacts_auto_sync
AFTER INSERT OR UPDATE ON public.marketing_contacts
FOR EACH ROW EXECUTE FUNCTION public.marketing_contacts_notify_sync();

-- 3) Cron job every 5 minutes: retry pending/error rows
DO $$
BEGIN
  PERFORM cron.unschedule('marketing_contacts_auto_sync_retry');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'marketing_contacts_auto_sync_retry',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/marketing-contacts-auto-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU'
    ),
    body := jsonb_build_object('action', 'retry_batch', 'limit', 200)
  );
  $cron$
);

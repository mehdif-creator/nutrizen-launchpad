
-- 1) Private settings table (only service_role can read)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.app_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.app_settings TO service_role;
ALTER TABLE private.app_settings ENABLE ROW LEVEL SECURITY;
-- no policies => no access for anon/authenticated even if grants leaked

-- Seed a random internal secret if missing
INSERT INTO private.app_settings(key, value)
VALUES ('marketing_sync_internal_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Helper to read it (SECURITY DEFINER, owned by postgres)
CREATE OR REPLACE FUNCTION private.get_setting(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT value FROM private.app_settings WHERE key = p_key
$$;
REVOKE ALL ON FUNCTION private.get_setting(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_setting(text) TO service_role;

-- 2) Rewrite the auto-sync notification trigger:
--    - fire only on inserts and on MEANINGFUL updates
--    - send shared-secret header to the edge function
CREATE OR REPLACE FUNCTION public.marketing_contacts_notify_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_url text := 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/marketing-contacts-auto-sync';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU';
  v_secret text;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  v_secret := private.get_setting('marketing_sync_internal_secret');

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon,
      'Authorization', 'Bearer ' || v_anon,
      'x-internal-sync-secret', v_secret
    ),
    body := jsonb_build_object('action', 'single', 'user_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

-- Restrict trigger to meaningful changes only.
-- INSERT: always considered meaningful.
-- UPDATE: only when email, marketing_opt_in changes, OR brevo_sync_status
--         is manually reset to 'pending' from something else.
-- Technical writes performed by the edge function itself (synced/error +
-- brevo_synced_at + brevo_last_error + brevo_contact_exists) DO NOT match
-- the WHEN clause => no recursion, no redundant calls.
DROP TRIGGER IF EXISTS trg_marketing_contacts_auto_sync ON public.marketing_contacts;

CREATE TRIGGER trg_marketing_contacts_auto_sync_ins
AFTER INSERT ON public.marketing_contacts
FOR EACH ROW
EXECUTE FUNCTION public.marketing_contacts_notify_sync();

CREATE TRIGGER trg_marketing_contacts_auto_sync_upd
AFTER UPDATE OF email, marketing_opt_in, brevo_sync_status
ON public.marketing_contacts
FOR EACH ROW
WHEN (
  NEW.email IS DISTINCT FROM OLD.email
  OR NEW.marketing_opt_in IS DISTINCT FROM OLD.marketing_opt_in
  OR (NEW.brevo_sync_status = 'pending' AND OLD.brevo_sync_status IS DISTINCT FROM 'pending')
)
EXECUTE FUNCTION public.marketing_contacts_notify_sync();

-- 3) Reschedule cron with the shared secret header
DO $$
BEGIN
  PERFORM cron.unschedule('marketing_contacts_auto_sync_retry');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $cronwrap$
DECLARE
  v_secret text := private.get_setting('marketing_sync_internal_secret');
  v_sql text;
BEGIN
  v_sql := format($f$
    SELECT net.http_post(
      url := 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/marketing-contacts-auto-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', %L,
        'Authorization', %L,
        'x-internal-sync-secret', %L
      ),
      body := jsonb_build_object('action', 'retry_batch', 'limit', 200)
    );
  $f$,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU',
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU',
    v_secret
  );
  PERFORM cron.schedule('marketing_contacts_auto_sync_retry', '*/5 * * * *', v_sql);
END
$cronwrap$;

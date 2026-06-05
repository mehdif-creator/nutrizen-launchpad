-- Marketing contacts table
CREATE TABLE IF NOT EXISTS public.marketing_contacts (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  provider text,
  providers text[],
  source text NOT NULL DEFAULT 'supabase_auth',
  raw_metadata jsonb,
  marketing_opt_in boolean DEFAULT false,
  brevo_sync_status text NOT NULL DEFAULT 'pending' CHECK (brevo_sync_status IN ('pending','synced','error')),
  brevo_synced_at timestamptz,
  brevo_last_error text,
  brevo_contact_exists boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_contacts TO authenticated;
GRANT ALL ON public.marketing_contacts TO service_role;

ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_contacts_email_lower_uidx
  ON public.marketing_contacts (lower(trim(email)));
CREATE INDEX IF NOT EXISTS marketing_contacts_brevo_sync_status_idx
  ON public.marketing_contacts (brevo_sync_status);
CREATE INDEX IF NOT EXISTS marketing_contacts_provider_idx
  ON public.marketing_contacts (provider);

-- Admins can read/manage; regular users cannot read.
DROP POLICY IF EXISTS "admins_select_marketing_contacts" ON public.marketing_contacts;
CREATE POLICY "admins_select_marketing_contacts"
  ON public.marketing_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins_modify_marketing_contacts" ON public.marketing_contacts;
CREATE POLICY "admins_modify_marketing_contacts"
  ON public.marketing_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.marketing_contacts_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_contacts_set_updated_at ON public.marketing_contacts;
CREATE TRIGGER trg_marketing_contacts_set_updated_at
  BEFORE UPDATE ON public.marketing_contacts
  FOR EACH ROW EXECUTE FUNCTION public.marketing_contacts_set_updated_at();

-- Extract providers helper
CREATE OR REPLACE FUNCTION public.extract_auth_providers(raw_app_meta jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN jsonb_typeof(raw_app_meta -> 'providers') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(raw_app_meta -> 'providers'))
    WHEN raw_app_meta ? 'provider'
      THEN ARRAY[raw_app_meta ->> 'provider']
    ELSE ARRAY[]::text[]
  END;
$$;

-- Sync trigger function
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_marketing_contacts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_provider text;
  v_providers text[];
BEGIN
  v_email := nullif(trim(NEW.email), '');
  IF v_email IS NULL THEN RETURN NEW; END IF;

  v_full_name := coalesce(
    nullif(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'given_name'), '')
  );
  v_provider := coalesce(nullif(trim(NEW.raw_app_meta_data ->> 'provider'), ''), 'unknown');
  v_providers := public.extract_auth_providers(NEW.raw_app_meta_data);

  INSERT INTO public.marketing_contacts (
    user_id, email, full_name, provider, providers, source, raw_metadata,
    created_at, updated_at, last_seen_at
  ) VALUES (
    NEW.id, v_email, v_full_name, v_provider, v_providers, 'supabase_auth',
    jsonb_build_object('raw_user_meta_data', NEW.raw_user_meta_data, 'raw_app_meta_data', NEW.raw_app_meta_data),
    coalesce(NEW.created_at, now()), now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    provider = EXCLUDED.provider,
    providers = EXCLUDED.providers,
    raw_metadata = EXCLUDED.raw_metadata,
    updated_at = now(),
    last_seen_at = now(),
    brevo_sync_status = CASE
      WHEN lower(trim(public.marketing_contacts.email)) <> lower(trim(EXCLUDED.email)) THEN 'pending'
      ELSE public.marketing_contacts.brevo_sync_status END,
    brevo_last_error = CASE
      WHEN lower(trim(public.marketing_contacts.email)) <> lower(trim(EXCLUDED.email)) THEN NULL
      ELSE public.marketing_contacts.brevo_last_error END,
    brevo_synced_at = CASE
      WHEN lower(trim(public.marketing_contacts.email)) <> lower(trim(EXCLUDED.email)) THEN NULL
      ELSE public.marketing_contacts.brevo_synced_at END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auth_user_to_marketing_contacts_insert ON auth.users;
CREATE TRIGGER trg_sync_auth_user_to_marketing_contacts_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_marketing_contacts();

DROP TRIGGER IF EXISTS trg_sync_auth_user_to_marketing_contacts_update ON auth.users;
CREATE TRIGGER trg_sync_auth_user_to_marketing_contacts_update
  AFTER UPDATE OF email, raw_user_meta_data, raw_app_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_marketing_contacts();

-- Backfill existing users
INSERT INTO public.marketing_contacts (
  user_id, email, full_name, provider, providers, source, raw_metadata,
  created_at, updated_at, last_seen_at
)
SELECT
  u.id,
  trim(u.email),
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'given_name'), '')
  ),
  coalesce(nullif(trim(u.raw_app_meta_data ->> 'provider'), ''), 'unknown'),
  public.extract_auth_providers(u.raw_app_meta_data),
  'supabase_auth',
  jsonb_build_object('raw_user_meta_data', u.raw_user_meta_data, 'raw_app_meta_data', u.raw_app_meta_data),
  coalesce(u.created_at, now()), now(), now()
FROM auth.users u
WHERE u.email IS NOT NULL AND trim(u.email) <> ''
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  provider = EXCLUDED.provider,
  providers = EXCLUDED.providers,
  raw_metadata = EXCLUDED.raw_metadata,
  updated_at = now(),
  last_seen_at = now();

-- Admin RPC: stats
CREATE OR REPLACE FUNCTION public.rpc_marketing_contacts_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'auth_users', (SELECT count(*) FROM auth.users WHERE email IS NOT NULL AND trim(email) <> ''),
    'contacts_total', (SELECT count(*) FROM public.marketing_contacts),
    'contacts_synced', (SELECT count(*) FROM public.marketing_contacts WHERE brevo_sync_status = 'synced'),
    'contacts_pending', (SELECT count(*) FROM public.marketing_contacts WHERE brevo_sync_status = 'pending'),
    'contacts_error', (SELECT count(*) FROM public.marketing_contacts WHERE brevo_sync_status = 'error'),
    'by_provider', (SELECT coalesce(jsonb_object_agg(provider, c), '{}'::jsonb)
                    FROM (SELECT provider, count(*) c FROM public.marketing_contacts GROUP BY provider) s)
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_marketing_contacts_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.extract_auth_providers(jsonb) TO authenticated, service_role;
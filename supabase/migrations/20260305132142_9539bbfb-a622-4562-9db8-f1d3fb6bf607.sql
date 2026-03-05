-- Table for shareable week plan links
CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  week_start_date date NOT NULL,
  plan_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Index for fast public lookups by token
CREATE INDEX idx_share_links_token ON public.share_links(token);

-- Index for user lookups
CREATE INDEX idx_share_links_user_week ON public.share_links(user_id, week_start_date);

-- Enable RLS
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own share links
CREATE POLICY "Users can insert their own share links"
  ON public.share_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own share links"
  ON public.share_links FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own share links"
  ON public.share_links FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public RPC to fetch shared plan by token (SECURITY DEFINER so anon can access)
CREATE OR REPLACE FUNCTION public.get_shared_week_plan(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
  v_menu record;
  v_profile record;
BEGIN
  -- Find the share link
  SELECT * INTO v_link
  FROM public.share_links
  WHERE token = p_token
    AND (expires_at IS NULL OR expires_at > now());

  IF v_link IS NULL THEN
    RETURN jsonb_build_object('error', 'Lien invalide ou expiré.');
  END IF;

  -- Fetch the weekly menu for that user + week
  SELECT menu_id, week_start, payload, created_at
  INTO v_menu
  FROM public.user_weekly_menus
  WHERE user_id = v_link.user_id
    AND week_start = v_link.week_start_date::text;

  IF v_menu IS NULL THEN
    RETURN jsonb_build_object('error', 'Menu introuvable pour cette semaine.');
  END IF;

  -- Get display name (safe: only public info)
  SELECT display_name, avatar_url
  INTO v_profile
  FROM public.profiles
  WHERE id = v_link.user_id;

  RETURN jsonb_build_object(
    'success', true,
    'week_start', v_menu.week_start,
    'menu_id', v_menu.menu_id,
    'days', v_menu.payload->'days',
    'created_at', v_menu.created_at,
    'shared_by', jsonb_build_object(
      'display_name', COALESCE(v_profile.display_name, 'Un utilisateur NutriZen'),
      'avatar_url', v_profile.avatar_url
    )
  );
END;
$$;

-- Grant anon access to the RPC
GRANT EXECUTE ON FUNCTION public.get_shared_week_plan(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_week_plan(text) TO authenticated;
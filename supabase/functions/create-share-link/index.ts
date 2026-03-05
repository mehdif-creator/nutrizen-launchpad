/**
 * create-share-link: Creates or returns an existing share link for a week plan
 */
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders } from '../_shared/security.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const weekStart = body.week_start;

    if (!weekStart || typeof weekStart !== 'string') {
      return new Response(
        JSON.stringify({ error: 'week_start requis (format YYYY-MM-DD)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if link already exists for this user + week
    const { data: existing } = await supabaseClient
      .from('share_links')
      .select('id, token, created_at, expires_at')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart)
      .maybeSingle();

    if (existing) {
      // Check if expired, if so refresh it
      if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
        // Delete expired and create new
        await supabaseClient.from('share_links').delete().eq('id', existing.id);
      } else {
        return new Response(
          JSON.stringify({
            success: true,
            token: existing.token,
            created_at: existing.created_at,
            expires_at: existing.expires_at,
            is_new: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify user has a menu for this week
    const { data: menu } = await supabaseClient
      .from('user_weekly_menus')
      .select('menu_id')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (!menu) {
      return new Response(
        JSON.stringify({ error: 'Aucun menu trouvé pour cette semaine. Génère d\'abord ton menu !' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new share link
    const { data: newLink, error: insertError } = await supabaseClient
      .from('share_links')
      .insert({
        user_id: user.id,
        week_start_date: weekStart,
        plan_id: menu.menu_id,
      })
      .select('id, token, created_at, expires_at')
      .single();

    if (insertError) {
      console.error('[create-share-link] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Impossible de créer le lien de partage.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award points for sharing (call social-share)
    try {
      await supabaseClient.functions.invoke('social-share', {
        body: { platform: 'share_link' },
      });
    } catch {
      // Non-blocking: points award failure shouldn't block sharing
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: newLink.token,
        created_at: newLink.created_at,
        expires_at: newLink.expires_at,
        is_new: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-share-link] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur inattendue.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

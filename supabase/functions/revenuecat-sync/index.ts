/**
 * Client-triggered RevenueCat sync (called after purchase / restore).
 *
 * Authenticated with the caller's Supabase JWT: the app can only ever sync
 * its OWN entitlement, and the entitlement itself is read server-side from
 * the RevenueCat REST API (never trusted from the client).
 */
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { syncAppUser } from '../_shared/revenuecat.ts';

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const state = await syncAppUser(admin, userData.user.id);
    console.log('[revenuecat-sync] synced', {
      user: userData.user.id.slice(0, 8) + '***',
      entitlement: state.entitlement,
      status: state.status,
    });

    return json({
      entitlement: state.entitlement,
      status: state.status,
      expires_at: state.expiresAt,
      will_renew: state.willRenew,
    });
  } catch (error) {
    console.error('[revenuecat-sync] error', error);
    return json({ error: error instanceof Error ? error.message : 'Sync failed' }, 500);
  }
});

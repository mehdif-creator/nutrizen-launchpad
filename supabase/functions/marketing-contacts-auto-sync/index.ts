// Auto-sync edge function — invoked by:
//   1) Postgres trigger via pg_net after INSERT/UPDATE on public.marketing_contacts
//   2) pg_cron every 5 minutes as retry pass for pending/error rows
//
// Security model:
//   - verify_jwt = false (called by pg_net without a user session)
//   - Body payload only carries a user_id (single sync) or {action:'retry_batch'}.
//   - The function ONLY reads/updates rows that already exist in marketing_contacts
//     and pushes them to Brevo. No PII can be injected from the caller.
//   - If BREVO_API_KEY is not configured, the function exits gracefully (no-op).
//
// Consent / filtering rule (documented):
//   - This project does not yet expose an opt-in checkbox in signup UI.
//   - Default behavior: sync ALL auth users (legitimate interest, product comms).
//   - To switch to strict opt-in, set env var REQUIRE_MARKETING_OPT_IN=true.

import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface ContactRow {
  user_id: string;
  email: string;
  full_name: string | null;
  marketing_opt_in: boolean | null;
  brevo_sync_status: string | null;
}

async function pushOne(
  admin: ReturnType<typeof createClient>,
  brevoApiKey: string,
  listIds: number[] | undefined,
  row: ContactRow,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!row.email || !row.email.includes('@')) {
      return { ok: false, error: 'invalid_email' };
    }

    const [firstName, ...rest] = (row.full_name || '').split(' ');
    const attrs: Record<string, unknown> = {};
    if (firstName) attrs.PRENOM = firstName;
    if (rest.length) attrs.NOM = rest.join(' ');

    const payload: Record<string, unknown> = {
      email: row.email,
      attributes: attrs,
      updateEnabled: true,
    };
    if (listIds) payload.listIds = listIds;

    const resp = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const text = await resp.text();
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { /* ignore */ }

    const ok = resp.ok || (resp.status === 400 && parsed?.code === 'duplicate_parameter');
    if (ok) {
      await admin.from('marketing_contacts').update({
        brevo_sync_status: 'synced',
        brevo_synced_at: new Date().toISOString(),
        brevo_last_error: null,
        brevo_contact_exists: true,
      }).eq('user_id', row.user_id);
      return { ok: true };
    }

    const err = `HTTP ${resp.status}: ${text.slice(0, 500)}`;
    await admin.from('marketing_contacts').update({
      brevo_sync_status: 'error',
      brevo_last_error: err,
    }).eq('user_id', row.user_id);
    return { ok: false, error: err };
  } catch (e: any) {
    const err = String(e?.message || e).slice(0, 500);
    await admin.from('marketing_contacts').update({
      brevo_sync_status: 'error',
      brevo_last_error: err,
    }).eq('user_id', row.user_id);
    return { ok: false, error: err };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const brevoListId = Deno.env.get('BREVO_LIST_ID');
    const requireOptIn = (Deno.env.get('REQUIRE_MARKETING_OPT_IN') || '').toLowerCase() === 'true';

    const admin = createClient(supabaseUrl, serviceKey);

    // ---- Shared-secret gate (required) ----
    // The function is verify_jwt=false because it's called by pg_net (no user session).
    // We protect it with an internal shared secret stored in private.app_settings
    // and sent by the DB trigger / cron in the `x-internal-sync-secret` header.
    const presented = req.headers.get('x-internal-sync-secret') || '';
    const { data: secretRow, error: secretErr } = await admin
      .schema('private' as any)
      .from('app_settings')
      .select('value')
      .eq('key', 'marketing_sync_internal_secret')
      .maybeSingle();
    const expected = (secretRow as any)?.value as string | undefined;
    if (secretErr || !expected) {
      console.error('[auto-sync] internal secret not configured');
      return json({ success: false, error: 'server_misconfigured' }, 500);
    }
    // constant-time-ish compare
    if (presented.length !== expected.length ||
        !crypto.subtle ||
        ![...presented].reduce((acc, c, i) => acc & (c.charCodeAt(0) === expected.charCodeAt(i) ? 1 : 0), 1)) {
      console.warn('[auto-sync] rejected: bad or missing internal secret');
      return json({ success: false, error: 'unauthorized' }, 401);
    }

    if (!brevoApiKey) {
      console.log('[auto-sync] BREVO_API_KEY missing — skipping (no-op).');
      return json({ success: true, skipped: true, reason: 'brevo_not_configured' });
    }

    const listIds = brevoListId ? [parseInt(brevoListId, 10)] : undefined;

    const body = await req.json().catch(() => ({}));
    const action = (body.action as string) || (body.user_id ? 'single' : 'retry_batch');

    // -------- Single user sync (called by DB trigger) --------
    if (action === 'single' && body.user_id) {
      const { data: row, error } = await admin
        .from('marketing_contacts')
        .select('user_id,email,full_name,marketing_opt_in,brevo_sync_status')
        .eq('user_id', body.user_id)
        .maybeSingle();
      if (error || !row) return json({ success: false, error: 'not_found' }, 404);
      if (requireOptIn && !row.marketing_opt_in) {
        return json({ success: true, skipped: true, reason: 'opt_in_required' });
      }
      const res = await pushOne(admin, brevoApiKey, listIds, row as ContactRow);
      return json({ success: res.ok, ...res });
    }

    // -------- Batch retry (called by pg_cron) --------
    const limit = Math.min(Number(body.limit) || 100, 500);
    let q = admin
      .from('marketing_contacts')
      .select('user_id,email,full_name,marketing_opt_in,brevo_sync_status')
      .in('brevo_sync_status', ['pending', 'error'])
      .order('updated_at', { ascending: true })
      .limit(limit);
    if (requireOptIn) q = q.eq('marketing_opt_in', true);

    const { data: rows, error } = await q;
    if (error) return json({ success: false, error: error.message }, 500);

    let synced = 0, failed = 0;
    for (const r of rows || []) {
      const res = await pushOne(admin, brevoApiKey, listIds, r as ContactRow);
      if (res.ok) synced++; else failed++;
    }
    console.log(`[auto-sync] batch processed=${rows?.length || 0} synced=${synced} failed=${failed}`);
    return json({ success: true, processed: rows?.length || 0, synced, failed });
  } catch (err: any) {
    console.error('[auto-sync] error', err);
    return json({ success: false, error: err?.message || 'internal_error' }, 500);
  }
});

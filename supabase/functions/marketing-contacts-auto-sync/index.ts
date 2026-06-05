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

function parseBrevoListIds(raw: string | undefined): number[] | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^["'\[]+|["'\]]+$/g, '');
  if (!cleaned) {
    console.warn('[auto-sync] BREVO_LIST_ID empty after trim — skipping listIds');
    return undefined;
  }
  const ids = cleaned
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && Number.isInteger(n) && n > 0);
  if (ids.length === 0) {
    console.error(`[auto-sync] BREVO_LIST_ID invalid (raw=${JSON.stringify(raw)}) — skipping listIds`);
    return undefined;
  }
  return ids;
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
    if (listIds && listIds.length > 0) {
      const safe = listIds.filter((v) => typeof v === 'number' && Number.isFinite(v));
      if (safe.length > 0) payload.listIds = safe;
    }

    const body = JSON.stringify(payload);
    let resp!: Response;
    for (let attempt = 0; attempt < 4; attempt++) {
      resp = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body,
      });
      if (resp.status !== 429) break;
      const retryAfter = Math.min(Number(resp.headers.get('retry-after')) || (attempt + 1), 5);
      await resp.text().catch(() => '');
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
    }

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

    const err = `HTTP ${resp.status}: ${text.slice(0, 400)} | payload=${body.slice(0, 200)}`;
    console.error('[auto-sync] brevo error', err);
    await admin.from('marketing_contacts').update({
      brevo_sync_status: 'error',
      brevo_last_error: err.slice(0, 1000),
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
    // The function runs with verify_jwt=false because it's called by pg_net
    // (DB trigger + pg_cron) which has no Supabase user session.
    // It is protected by an internal shared secret stored in private.app_settings
    // (only readable via the SECURITY DEFINER RPC public.verify_marketing_sync_secret,
    // granted to service_role only). The trigger and cron send it in the
    // `x-internal-sync-secret` header. Any caller without that header is rejected.
    const presented = req.headers.get('x-internal-sync-secret') || '';
    if (!presented) {
      return json({ success: false, error: 'unauthorized' }, 401);
    }
    const { data: isValid, error: verifyErr } = await admin.rpc(
      'verify_marketing_sync_secret',
      { p_secret: presented },
    );
    if (verifyErr) {
      console.error('[auto-sync] secret verification failed', verifyErr);
      return json({ success: false, error: 'server_misconfigured' }, 500);
    }
    if (isValid !== true) {
      console.warn('[auto-sync] rejected: bad internal secret');
      return json({ success: false, error: 'unauthorized' }, 401);
    }

    if (!brevoApiKey) {
      console.log('[auto-sync] BREVO_API_KEY missing — skipping (no-op).');
      return json({ success: true, skipped: true, reason: 'brevo_not_configured' });
    }

    const listIds = parseBrevoListIds(brevoListId);
    console.log(`[auto-sync] listIds resolved=${JSON.stringify(listIds)} (raw=${JSON.stringify(brevoListId)})`);

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

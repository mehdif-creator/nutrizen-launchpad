// Admin edge function: stats, sync to Brevo, export CSV, backfill
import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return json({ error: 'unauthorized' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from('user_roles').select('role')
      .eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'stats') {
      const { data, error } = await admin.rpc('rpc_marketing_contacts_stats');
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, stats: data });
    }

    if (action === 'backfill') {
      // Re-run by touching auth.users via SQL is not directly possible; instead select all auth users via service role and upsert
      const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) return json({ error: error.message }, 500);
      let count = 0;
      const rows = users.users
        .filter((u: any) => u.email && u.email.trim() !== '')
        .map((u: any) => ({
          user_id: u.id,
          email: u.email.trim(),
          full_name:
            u.user_metadata?.full_name?.trim() ||
            u.user_metadata?.name?.trim() ||
            u.user_metadata?.given_name?.trim() ||
            null,
          provider: u.app_metadata?.provider || 'unknown',
          providers: Array.isArray(u.app_metadata?.providers)
            ? u.app_metadata.providers
            : u.app_metadata?.provider
              ? [u.app_metadata.provider]
              : [],
          source: 'supabase_auth',
          raw_metadata: {
            raw_user_meta_data: u.user_metadata,
            raw_app_meta_data: u.app_metadata,
          },
        }));
      // chunk upsert
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error: upErr } = await admin
          .from('marketing_contacts')
          .upsert(chunk, { onConflict: 'user_id' });
        if (upErr) return json({ error: upErr.message }, 500);
        count += chunk.length;
      }
      return json({ success: true, backfilled: count });
    }

    if (action === 'export_csv') {
      const { data, error } = await admin
        .from('marketing_contacts')
        .select('email,full_name,provider,brevo_sync_status,created_at')
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };
      const header = 'email,full_name,provider,brevo_sync_status,created_at\n';
      const csv = header + (data || []).map((r: any) =>
        [r.email, r.full_name, r.provider, r.brevo_sync_status, r.created_at].map(escape).join(',')
      ).join('\n');
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="marketing_contacts.csv"',
        },
      });
    }

    if (action === 'sync_brevo') {
      const brevoApiKey = Deno.env.get('BREVO_API_KEY');
      const brevoListId = Deno.env.get('BREVO_LIST_ID');
      if (!brevoApiKey) return json({ error: 'BREVO_API_KEY not configured', skipped: true }, 200);

      const onlyPending = body.only_pending !== false;
      const limit = Math.min(Number(body.limit) || 500, 1000);

      let query = admin
        .from('marketing_contacts')
        .select('user_id,email,full_name,brevo_sync_status')
        .limit(limit);
      if (onlyPending) query = query.in('brevo_sync_status', ['pending', 'error']);
      const { data: rows, error } = await query;
      if (error) return json({ error: error.message }, 500);

      let synced = 0, failed = 0;
      const listIds = brevoListId ? [parseInt(brevoListId, 10)] : undefined;

      for (const r of rows || []) {
        try {
          const [firstName, ...rest] = (r.full_name || '').split(' ');
          const attrs: any = {};
          if (firstName) attrs.PRENOM = firstName;
          if (rest.length) attrs.NOM = rest.join(' ');

          const payload: any = {
            email: r.email,
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

          // 201 created, 204 created no body, 400 duplicate_parameter => already exists (we sent updateEnabled so usually 204)
          const ok = resp.ok || (resp.status === 400 && parsed?.code === 'duplicate_parameter');
          if (ok) {
            await admin.from('marketing_contacts').update({
              brevo_sync_status: 'synced',
              brevo_synced_at: new Date().toISOString(),
              brevo_last_error: null,
              brevo_contact_exists: true,
            }).eq('user_id', r.user_id);
            synced++;
          } else {
            await admin.from('marketing_contacts').update({
              brevo_sync_status: 'error',
              brevo_last_error: `HTTP ${resp.status}: ${text.slice(0, 500)}`,
            }).eq('user_id', r.user_id);
            failed++;
          }
        } catch (e: any) {
          await admin.from('marketing_contacts').update({
            brevo_sync_status: 'error',
            brevo_last_error: String(e?.message || e).slice(0, 500),
          }).eq('user_id', r.user_id);
          failed++;
        }
      }

      return json({ success: true, synced, failed, processed: (rows || []).length });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (err: any) {
    console.error('[marketing-contacts-admin] error', err);
    return json({ error: err?.message || 'internal_error' }, 500);
  }
});

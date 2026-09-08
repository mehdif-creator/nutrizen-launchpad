import { sendWebPush } from './webpush.ts';

interface NotifyPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// deno-lint-ignore no-explicit-any
type AdminClient = any;

/** Best-effort push delivery to every registered device of the given users. */
export async function pushToUsers(
  admin: AdminClient,
  userIds: string[],
  payload: NotifyPayload
): Promise<void> {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@mynutrizen.fr';
  if (!publicKey || !privateKey || userIds.length === 0) return;

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  if (!subs?.length) return;

  await Promise.allSettled(
    subs.map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        const { status, body } = await sendWebPush(s, payload, {
          publicKey,
          privateKey,
          subject,
        });
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id);
        } else if (status >= 400) {
          console.error('[push] failed', status, body);
          await admin
            .from('push_subscriptions')
            .update({ last_error: `${status}: ${body.slice(0, 300)}` })
            .eq('id', s.id);
        } else {
          await admin
            .from('push_subscriptions')
            .update({ last_success_at: new Date().toISOString(), last_error: null })
            .eq('id', s.id);
        }
      } catch (e) {
        console.error('[push] error', e);
      }
    })
  );
}

/** Push to every admin user. */
export async function pushToAdmins(admin: AdminClient, payload: NotifyPayload): Promise<void> {
  const { data: roles } = await admin.from('user_roles').select('user_id').eq('role', 'admin');
  const ids = (roles ?? []).map((r: { user_id: string }) => r.user_id);
  await pushToUsers(admin, ids, payload);
}

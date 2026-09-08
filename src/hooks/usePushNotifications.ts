import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// The generated Supabase types do not include push_subscriptions yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// Public VAPID key (safe to expose in the browser).
const VAPID_PUBLIC_KEY =
  'BPkRXXtEEOSMgXz3Tn6p4_1prHHaYoHAYukoC6de6i-pOqYgsn0j2IMMXVD4BHdBQ-Nz5ZUHJVVt3r_d04t0pxI';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return window.btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function usePushNotifications() {
  const { user } = useAuth();
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) setEnabled(!!sub && Notification.permission === 'granted');
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported || !user?.id) return false;
    setLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError("Les notifications ont été refusées dans les réglages du navigateur.");
        return false;
      }
      const reg =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register('/sw.js'));
      await navigator.serviceWorker.ready;

      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        }));

      const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const p256dh = json.keys?.p256dh ?? bufferToBase64Url(sub.getKey('p256dh'));
      const authKey = json.keys?.auth ?? bufferToBase64Url(sub.getKey('auth'));

      const { error: dbError } = await db.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh,
          auth: authKey,
          user_agent: navigator.userAgent.slice(0, 300),
        },
        { onConflict: 'endpoint' }
      );
      if (dbError) throw dbError;

      setEnabled(true);
      return true;
    } catch (e) {
      console.error('[push] enable failed', e);
      setError("Impossible d'activer les notifications sur cet appareil.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, user?.id]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
    } catch (e) {
      console.error('[push] disable failed', e);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return { supported, enabled, loading, error, enable, disable };
}

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ADMIN_LIVE_EVENT,
  ADMIN_LIVE_ORIGIN_ID,
  ADMIN_LIVE_STORAGE_KEY,
  type AdminInvalidateMessage,
  getAdminLiveChannel,
  invalidateAdminQueries,
} from '@/lib/adminLive';

/**
 * Mounted once at app level (inside BrowserRouter + QueryClientProvider).
 * Listens for every signal that should refresh admin data and triggers a
 * predicate-based invalidate on TanStack Query.
 *
 * - Route change inside /admin → invalidate
 * - Window focus / visibilitychange (when on /admin) → invalidate
 * - BroadcastChannel + storage event + same-tab DOM event → invalidate
 *
 * Note: TanStack Query's global config already does refetchOnWindowFocus +
 * refetchOnReconnect; this provider adds the route-change + cross-tab layer
 * and is also safe for non-admin routes (it does nothing when off /admin).
 */
export function AdminLiveListener() {
  const qc = useQueryClient();
  const location = useLocation();
  const lastPath = useRef<string | null>(null);
  const lastInvalidateAt = useRef(0);

  const isAdminRoute = location.pathname.startsWith('/admin');

  const invalidate = (reason: string) => {
    // Tight dedupe — many triggers can fire in the same ms (focus + visibility).
    const now = Date.now();
    if (now - lastInvalidateAt.current < 200) return;
    lastInvalidateAt.current = now;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[admin-live] invalidate', reason);
    }
    invalidateAdminQueries(qc);
  };

  // Route-change inside /admin → revalidate the new section.
  useEffect(() => {
    if (!isAdminRoute) {
      lastPath.current = null;
      return;
    }
    if (lastPath.current !== null && lastPath.current !== location.pathname) {
      invalidate(`route:${location.pathname}`);
    }
    lastPath.current = location.pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isAdminRoute]);

  // Cross-tab + focus/visibility + same-tab broadcast.
  useEffect(() => {
    const onMessage = (msg: AdminInvalidateMessage | undefined) => {
      if (!msg || msg.type !== 'admin:invalidate') return;
      invalidate(`broadcast:${msg.reason ?? 'unknown'}`);
    };

    const ch = getAdminLiveChannel();
    const chHandler = (e: MessageEvent<AdminInvalidateMessage>) => onMessage(e.data);
    ch?.addEventListener('message', chHandler);

    const storageHandler = (e: StorageEvent) => {
      if (e.key !== ADMIN_LIVE_STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as AdminInvalidateMessage;
        if (parsed.origin === ADMIN_LIVE_ORIGIN_ID) return; // already handled locally
        onMessage(parsed);
      } catch {
        /* noop */
      }
    };
    window.addEventListener('storage', storageHandler);

    const sameTabHandler = (e: Event) => {
      const detail = (e as CustomEvent<AdminInvalidateMessage>).detail;
      onMessage(detail);
    };
    window.addEventListener(ADMIN_LIVE_EVENT, sameTabHandler as EventListener);

    const onFocus = () => {
      if (location.pathname.startsWith('/admin')) invalidate('focus');
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && location.pathname.startsWith('/admin')) {
        invalidate('visibility');
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      ch?.removeEventListener('message', chHandler);
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener(ADMIN_LIVE_EVENT, sameTabHandler as EventListener);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}

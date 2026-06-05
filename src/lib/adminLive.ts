/**
 * Centralized admin live-data layer.
 *
 * Goal: keep all admin pages (/admin/*) fresh without page-by-page boilerplate.
 *
 * Triggers handled by AdminLiveProvider:
 *  - Window focus / visibilitychange   → revalidate admin queries
 *  - Route change within /admin        → revalidate admin queries
 *  - BroadcastChannel + storage event  → cross-tab invalidation
 *  - Mutations call broadcastAdminInvalidate() to notify every tab
 *
 * Query-key convention: any TanStack query whose first key segment starts with
 * one of ADMIN_QUERY_KEY_PREFIXES will be revalidated.
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query';

export const ADMIN_QUERY_KEY_PREFIXES = ['admin', 'admin-', 'kpi-', 'marketing-contacts'];

const CHANNEL_NAME = 'nutrizen-admin-live';
const STORAGE_KEY = 'nutrizen.admin.invalidate';

export type AdminInvalidateMessage = {
  type: 'admin:invalidate';
  reason?: string;
  ts: number;
  origin: string;
};

const ORIGIN_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function isAdminQueryKey(key: QueryKey): boolean {
  if (!Array.isArray(key) || key.length === 0) return false;
  const first = key[0];
  if (typeof first !== 'string') return false;
  return ADMIN_QUERY_KEY_PREFIXES.some((p) => first === p || first.startsWith(p));
}

/** Invalidate every TanStack query that belongs to the admin area. */
export function invalidateAdminQueries(qc: QueryClient): void {
  qc.invalidateQueries({
    predicate: (q) => isAdminQueryKey(q.queryKey),
    refetchType: 'active',
  });
}

/**
 * Notify *all* tabs (including the current one) that admin data changed.
 * Throttled to avoid storms when many mutations fire back-to-back.
 */
let lastBroadcast = 0;
let pendingTimer: number | null = null;
const THROTTLE_MS = 400;

export function broadcastAdminInvalidate(reason?: string): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const fire = () => {
    lastBroadcast = Date.now();
    const msg: AdminInvalidateMessage = {
      type: 'admin:invalidate',
      reason,
      ts: lastBroadcast,
      origin: ORIGIN_ID,
    };
    const ch = getChannel();
    if (ch) {
      try {
        ch.postMessage(msg);
      } catch {
        /* noop */
      }
    }
    // Storage event fallback for browsers / contexts without BroadcastChannel.
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(msg));
    } catch {
      /* noop */
    }
    // Dispatch a same-tab DOM event so the listener invalidates here too.
    window.dispatchEvent(new CustomEvent<AdminInvalidateMessage>(CHANNEL_NAME, { detail: msg }));
  };

  if (now - lastBroadcast >= THROTTLE_MS) {
    fire();
    return;
  }
  if (pendingTimer != null) return;
  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    fire();
  }, THROTTLE_MS - (now - lastBroadcast));
}

export const ADMIN_LIVE_EVENT = CHANNEL_NAME;
export const ADMIN_LIVE_STORAGE_KEY = STORAGE_KEY;
export const ADMIN_LIVE_ORIGIN_ID = ORIGIN_ID;
export function getAdminLiveChannel() {
  return getChannel();
}

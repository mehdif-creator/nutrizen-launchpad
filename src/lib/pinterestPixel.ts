/**
 * Pinterest Tag tracking utility with GDPR consent awareness
 * Only fires events when marketing consent is granted
 */

import { canLoadMarketing } from '@/lib/cookies/consent';

// Pinterest Tag ID
const PINTEREST_TAG_ID = '2613417274481';

declare global {
  interface Window {
    pintrk?: (
      command: string,
      eventOrValue?: string,
      paramsOrEmail?: Record<string, unknown> | string
    ) => void;
  }
}

/**
 * Check if Pinterest tag is available and consent is granted
 */
function canTrack(): boolean {
  return typeof window !== 'undefined' && !!window.pintrk && canLoadMarketing();
}

/**
 * Track a standard Pinterest event
 */
export function trackPinterestEvent(
  event: string,
  params?: Record<string, unknown>
): void {
  if (!canTrack()) {
    // Consent not granted or pintrk not loaded — silently skip
    return;
  }
  try {
    window.pintrk!('track', event, params);
  } catch {
    // Silently fail if pixel is blocked
  }
}

/**
 * Track page visit (standard Pinterest page event)
 */
export function trackPageVisit(): void {
  trackPinterestEvent('pagevisit');
}

/**
 * Track signup — when a user creates an account (free or paid)
 */
export function trackSignup(params?: Record<string, unknown>): void {
  trackPinterestEvent('signup', params);
}

/**
 * Track checkout initiation — when user starts checkout process
 */
export function trackCheckout(params: {
  value?: number;
  currency?: string;
  order_quantity?: number;
  order_id?: string;
  product_ids?: string[];
}): void {
  trackPinterestEvent('checkout', {
    value: params.value || 0,
    currency: params.currency || 'EUR',
    order_quantity: params.order_quantity || 1,
    order_id: params.order_id,
    product_ids: params.product_ids || [],
  });
}

/**
 * Track add to cart — when user adds a plan or credits
 */
export function trackAddToCart(params: {
  value?: number;
  currency?: string;
  order_quantity?: number;
  product_id?: string;
}): void {
  trackPinterestEvent('addtocart', {
    value: params.value || 0,
    currency: params.currency || 'EUR',
    order_quantity: params.order_quantity || 1,
    product_id: params.product_id,
  });
}

/**
 * Track lead — when user starts free trial or expresses interest
 */
export function trackLead(params?: Record<string, unknown>): void {
  trackPinterestEvent('lead', params);
}

/**
 * Track search — when user searches on the site
 */
export function trackSearch(params?: { search_query?: string }): void {
  trackPinterestEvent('search', params);
}

/**
 * Track view category — when user browses a section (recipes, blog, etc.)
 */
export function trackViewCategory(params?: { product_category?: string }): void {
  trackPinterestEvent('viewcategory', params);
}

/**
 * Track custom event
 */
export function trackCustomEvent(
  event: string,
  params?: Record<string, unknown>
): void {
  if (!canTrack()) return;
  try {
    window.pintrk!('track', event, params);
  } catch {
    // Silently fail
  }
}

/**
 * Set user data (email hash) for enhanced matching.
 * Call after user logs in or provides email.
 * Note: SHA-256 hashed email is preferred. Pass pre-hashed email if available.
 */
export function setPinterestEmail(email: string): void {
  if (!canTrack()) return;
  try {
    window.pintrk!('set', 'email', email);
  } catch {
    // Silently fail
  }
}

/**
 * Meta Pixel (Facebook) tracking utility with GDPR consent awareness
 * Only fires events when marketing consent is granted
 */

import { canLoadMarketing } from '@/lib/cookies/consent';

// Pixel ID from Meta Business account
const META_PIXEL_ID = '1721582435950710';

declare global {
  interface Window {
    fbq?: (
      command: string,
      event: string,
      params?: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => void;
  }
}

/**
 * Check if Meta Pixel is available and consent is granted
 */
function canTrack(): boolean {
  return typeof window !== 'undefined' && !!window.fbq && canLoadMarketing();
}

/**
 * Track a standard Meta Pixel event
 */
export function trackEvent(
  event: string,
  params?: Record<string, unknown>
): void {
  if (!canTrack()) {
    // Consent not granted or fbq not loaded — silently skip
    return;
  }
  try {
    window.fbq!('track', event, params);
  } catch {
    // Silently fail if pixel is blocked
  }
}

/**
 * Track a custom Meta Pixel event
 */
export function trackCustomEvent(
  event: string,
  params?: Record<string, unknown>
): void {
  if (!canTrack()) return;
  try {
    window.fbq!('trackCustom', event, params);
  } catch {
    // Silently fail
  }
}

/**
 * Track PageView
 */
export function trackPageView(): void {
  trackEvent('PageView');
}

/**
 * Track InitiateCheckout — when user clicks a paid plan or credit pack
 */
export function trackInitiateCheckout(params: {
  content_ids?: string[];
  content_type?: string;
  currency?: string;
  value?: number;
  num_items?: number;
}): void {
  trackEvent('InitiateCheckout', {
    content_ids: params.content_ids || [],
    content_type: params.content_type || 'product',
    currency: params.currency || 'EUR',
    value: params.value || 0,
    num_items: params.num_items || 1,
  });
}

/**
 * Track Purchase — after successful payment
 */
export function trackPurchase(params: {
  content_ids?: string[];
  content_type?: string;
  currency?: string;
  value?: number;
  num_items?: number;
  order_id?: string;
}): void {
  trackEvent('Purchase', {
    content_ids: params.content_ids || [],
    content_type: params.content_type || 'product',
    currency: params.currency || 'EUR',
    value: params.value || 0,
    num_items: params.num_items || 1,
    order_id: params.order_id,
  });
}

/**
 * Track Lead — when user starts free trial or signs up
 */
export function trackLead(params?: Record<string, unknown>): void {
  trackEvent('Lead', params);
}

/**
 * Track CompleteRegistration — after account creation
 */
export function trackCompleteRegistration(params?: Record<string, unknown>): void {
  trackEvent('CompleteRegistration', params);
}

/**
 * Track ViewContent — when viewing a product/plan page
 */
export function trackViewContent(params: {
  content_ids?: string[];
  content_type?: string;
  currency?: string;
  value?: number;
}): void {
  trackEvent('ViewContent', {
    content_ids: params.content_ids || [],
    content_type: params.content_type || 'product',
    currency: params.currency || 'EUR',
    value: params.value || 0,
  });
}

/**
 * Track AddToCart — when user adds credits or a plan
 */
export function trackAddToCart(params: {
  content_ids?: string[];
  content_type?: string;
  currency?: string;
  value?: number;
}): void {
  trackEvent('AddToCart', {
    content_ids: params.content_ids || [],
    content_type: params.content_type || 'product',
    currency: params.currency || 'EUR',
    value: params.value || 0,
  });
}

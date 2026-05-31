/**
 * Unified analytics facade for Meta Pixel + Pinterest Tag.
 * All calls respect GDPR consent via the underlying pixel helpers.
 */
import { trackPageView as metaPageView, trackCompleteRegistration as metaCompleteRegistration } from '@/lib/metaPixel';
import { trackPageVisit as pinPageVisit, trackSignup as pinSignup } from '@/lib/pinterestPixel';

/** Fire PageView (Meta) + pagevisit (Pinterest). Safe to call on every SPA route change. */
export function trackPageView(): void {
  metaPageView();
  pinPageVisit();
}

/** Fire CompleteRegistration (Meta) + signup (Pinterest). Call once after a successful account creation. */
export function trackCompleteRegistration(params?: Record<string, unknown>): void {
  metaCompleteRegistration({
    content_name: 'NutriZen Signup',
    status: 'registered',
    ...(params || {}),
  });
  pinSignup({ lead_type: 'NutriZen Signup', ...(params || {}) });
}

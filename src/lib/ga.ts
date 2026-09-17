/**
 * Google Analytics 4 (gtag.js) — browser-only.
 * The measurement ID is a public identifier (visible in page source anyway).
 * Read from VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID or the GA connector var.
 */

const measurementId =
  import.meta.env.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID ||
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

let initialized = false;

/** Load gtag.js once at app startup. No-op when no measurement ID is configured. */
export function initGoogleAnalytics(): void {
  if (initialized || !measurementId || typeof window === 'undefined') return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['js', new Date()]);
  window.dataLayer.push(['config', measurementId]);
}

/** Fire a GA4 page_view on SPA route changes. */
export function trackGaPageView(path: string): void {
  if (!initialized || !window.dataLayer) return;
  window.dataLayer.push(['event', 'page_view', { page_path: path }]);
}

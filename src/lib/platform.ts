import { Capacitor } from '@capacitor/core';

/** Canonical public web origin (used by the native app for email links). */
export const WEB_ORIGIN = 'https://mynutrizen.fr';

/** Custom-scheme deep link that brings the OAuth flow back into the native app. */
export const NATIVE_AUTH_CALLBACK_URL = 'nutrizen://auth/callback';

/** True when running inside the Capacitor Android/iOS shell (never true in a browser). */
export const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Origin used to build email redirect links (magic link, reset password).
 * Web: unchanged (window.location.origin). Native: the public web domain, because
 * `window.location.origin` inside the WebView is not reachable from an email client.
 */
export const getWebOrigin = (): string =>
  isNativePlatform() ? WEB_ORIGIN : window.location.origin;

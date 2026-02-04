/**
 * GDPR/RGPD Cookie Consent Utility
 * Manages user consent for cookie categories
 */

export const CONSENT_VERSION = '1.0';
export const CONSENT_KEY = 'nutrizen-cookie-consent';

export interface CookieConsent {
  necessary: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: number;
  customized: boolean; // Whether user customized their choices
}

export const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  version: CONSENT_VERSION,
  timestamp: 0,
  customized: false,
};

/**
 * Get current consent from localStorage
 */
export function getConsent(): CookieConsent | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    
    const consent = JSON.parse(stored) as CookieConsent;
    
    // If version has changed, return null to re-show banner
    if (consent.version !== CONSENT_VERSION) {
      return null;
    }
    
    return consent;
  } catch {
    return null;
  }
}

/**
 * Check if consent has been given (any response, accept or reject)
 */
export function hasConsentBeenGiven(): boolean {
  return getConsent() !== null;
}

/**
 * Check if analytics consent is granted
 */
export function hasAnalyticsConsent(): boolean {
  const consent = getConsent();
  return consent?.analytics ?? false;
}

/**
 * Check if marketing consent is granted
 */
export function hasMarketingConsent(): boolean {
  const consent = getConsent();
  return consent?.marketing ?? false;
}

/**
 * Save consent to localStorage
 */
export function saveConsent(consent: Partial<CookieConsent>): void {
  const fullConsent: CookieConsent = {
    ...DEFAULT_CONSENT,
    ...consent,
    necessary: true, // Always ensure necessary is true
    version: CONSENT_VERSION,
    timestamp: Date.now(),
  };
  
  localStorage.setItem(CONSENT_KEY, JSON.stringify(fullConsent));
  
  // Dispatch custom event for components to react
  window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: fullConsent }));
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): void {
  saveConsent({
    analytics: true,
    marketing: true,
    customized: false,
  });
}

/**
 * Reject all optional cookies (keep only necessary)
 */
export function rejectAllCookies(): void {
  saveConsent({
    analytics: false,
    marketing: false,
    customized: false,
  });
}

/**
 * Save custom consent preferences
 */
export function saveCustomConsent(analytics: boolean, marketing: boolean): void {
  saveConsent({
    analytics,
    marketing,
    customized: true,
  });
}

/**
 * Clear consent (for testing or user request)
 */
export function clearConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
  window.dispatchEvent(new CustomEvent('cookie-consent-cleared'));
}

/**
 * Hook-friendly consent check for analytics
 * Returns true only if analytics consent is explicitly granted
 */
export function canLoadAnalytics(): boolean {
  return hasAnalyticsConsent();
}

/**
 * Hook-friendly consent check for marketing
 * Returns true only if marketing consent is explicitly granted
 */
export function canLoadMarketing(): boolean {
  return hasMarketingConsent();
}

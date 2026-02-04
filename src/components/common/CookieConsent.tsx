import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X, Settings, Cookie } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getConsent,
  acceptAllCookies,
  rejectAllCookies,
  saveCustomConsent,
  hasConsentBeenGiven,
  type CookieConsent as ConsentType,
} from '@/lib/cookies/consent';

interface CookieConsentProps {
  className?: string;
}

export function CookieConsent({ className }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Check if consent has been given
    if (!hasConsentBeenGiven()) {
      setVisible(true);
    }
    
    // Load existing preferences for customization
    const existing = getConsent();
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  // Listen for external requests to open settings (from footer link)
  useEffect(() => {
    const handleOpenSettings = () => {
      const existing = getConsent();
      if (existing) {
        setAnalytics(existing.analytics);
        setMarketing(existing.marketing);
      }
      setShowCustomize(true);
      setVisible(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
  }, []);

  const handleAcceptAll = useCallback(() => {
    acceptAllCookies();
    setVisible(false);
    setShowCustomize(false);
  }, []);

  const handleRejectAll = useCallback(() => {
    rejectAllCookies();
    setVisible(false);
    setShowCustomize(false);
  }, []);

  const handleSaveCustom = useCallback(() => {
    saveCustomConsent(analytics, marketing);
    setVisible(false);
    setShowCustomize(false);
  }, [analytics, marketing]);

  const handleClose = useCallback(() => {
    // If user closes without choosing, treat as reject
    if (!hasConsentBeenGiven()) {
      rejectAllCookies();
    }
    setVisible(false);
    setShowCustomize(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md',
        'animate-in slide-in-from-bottom-5 duration-300',
        className
      )}
      role="dialog"
      aria-label="Paramètres des cookies"
      aria-modal="true"
    >
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
            <h2 className="font-semibold text-sm">Gestion des cookies</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main content */}
        {!showCustomize ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Nous utilisons des cookies pour améliorer votre expérience et analyser l'utilisation du site.{' '}
              <a
                href="/legal/confidentialite"
                className="underline hover:text-foreground transition-colors"
              >
                En savoir plus
              </a>
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleAcceptAll}
                size="sm"
                className="flex-1"
              >
                Tout accepter
              </Button>
              <Button
                onClick={handleRejectAll}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Tout refuser
              </Button>
              <Button
                onClick={() => setShowCustomize(true)}
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
                aria-expanded={showCustomize}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Personnaliser</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Customize panel */}
            <div className="space-y-4 mb-4">
              {/* Necessary - always on */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="necessary" className="text-sm font-medium">
                    Cookies nécessaires
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Essentiels au fonctionnement du site
                  </p>
                </div>
                <Switch
                  id="necessary"
                  checked={true}
                  disabled
                  aria-label="Cookies nécessaires (toujours actif)"
                />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics" className="text-sm font-medium">
                    Cookies analytiques
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Nous aident à comprendre l'utilisation du site
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                  aria-label="Cookies analytiques"
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing" className="text-sm font-medium">
                    Cookies marketing
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Permettent des publicités personnalisées
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={marketing}
                  onCheckedChange={setMarketing}
                  aria-label="Cookies marketing"
                />
              </div>
            </div>

            {/* Save buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleSaveCustom}
                size="sm"
                className="flex-1"
              >
                Enregistrer mes choix
              </Button>
              <Button
                onClick={() => setShowCustomize(false)}
                variant="ghost"
                size="sm"
              >
                Retour
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Helper to open cookie settings from anywhere (e.g., footer link)
 */
export function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent('open-cookie-settings'));
}

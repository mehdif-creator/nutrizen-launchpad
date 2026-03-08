import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('nutrizen-install-dismissed')) {
      setDismissed(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('nutrizen-install-dismissed', '1');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm bg-card border rounded-xl shadow-lg p-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <Download className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Installer NutriZen</p>
          <p className="text-xs text-muted-foreground mt-1">
            Accédez rapidement à vos menus et recettes depuis votre écran d'accueil.
          </p>
          <Button size="sm" className="mt-2" onClick={handleInstall}>
            Installer l'app
          </Button>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

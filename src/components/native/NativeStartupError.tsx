import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNativeStartup } from '@/contexts/NativeStartupContext';

/**
 * Native error screen shown when the startup reads (profil / offre) fail.
 * Never lets the user through onboarding or paywall — only a real retry can.
 */
export function NativeStartupError() {
  const { errorMessage, retry } = useNativeStartup();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <h1 className="text-lg font-semibold text-foreground">Connexion impossible</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Nous n'avons pas pu charger votre compte. Vérifiez votre connexion internet puis réessayez.
      </p>
      {errorMessage && <p className="text-xs text-muted-foreground/70">{errorMessage}</p>}
      <Button onClick={retry} className="mt-2">
        <RefreshCw className="mr-2 h-4 w-4" />
        Réessayer
      </Button>
    </div>
  );
}

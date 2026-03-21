import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useBootstrapHealth } from '@/hooks/useBootstrapHealth';

interface BootstrapRecoveryProps {
  userId: string;
  /** Called after a successful repair */
  onRepaired?: () => void;
}

/**
 * Full-screen recovery UI shown when the user's account bootstrap
 * is incomplete or when the onboarding status check fails.
 * Replaces the old fail-open behavior that silently skipped onboarding.
 */
export function BootstrapRecovery({ userId, onRepaired }: BootstrapRecoveryProps) {
  const { health, state, repair, isRepairing } = useBootstrapHealth(userId);

  const handleRepair = () => {
    repair();
    // After repair settles, call onRepaired to re-evaluate routing
    setTimeout(() => onRepaired?.(), 2000);
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">
            Vérification de ton compte…
          </h2>
          <p className="text-sm text-muted-foreground">
            Nous préparons ton espace. Un instant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Finalisation de ton compte
          </h2>
          <p className="text-sm text-muted-foreground">
            Ton compte n'a pas été entièrement initialisé. 
            Clique ci-dessous pour le finaliser automatiquement.
          </p>
        </div>

        {/* Show which pieces are missing */}
        {state === 'incomplete' && (
          <div className="text-left bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
            <StatusLine label="Profil" ok={health.profile} />
            <StatusLine label="Portefeuille crédits" ok={health.wallet} />
            <StatusLine label="Statistiques" ok={health.stats} />
            <StatusLine label="Préférences" ok={health.preferences} />
          </div>
        )}

        <Button
          onClick={handleRepair}
          disabled={isRepairing}
          className="w-full gap-2"
          size="lg"
        >
          {isRepairing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Réparation en cours…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Finaliser mon compte
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Si le problème persiste, contacte le support.
        </p>
      </div>
    </div>
  );
}

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={ok ? 'text-emerald-500' : 'text-amber-500'}>
        {ok ? '✓' : '✗'}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

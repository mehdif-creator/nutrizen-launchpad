import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  title?: string;
  description?: string;
}

/**
 * Bandeau très visible affiché pendant une action qui consomme des crédits.
 * Bloque les clics sur la page pour éviter les doubles déclenchements.
 */
export function CreditActionInProgress({
  open,
  title = 'Génération en cours…',
  description = 'Cette action utilise vos crédits. Merci de patienter et de ne pas cliquer à nouveau.',
}: Props) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-background/60 backdrop-blur-sm pt-24 px-4"
      role="alertdialog"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-primary bg-card p-5 shadow-2xl flex items-start gap-4">
        <Loader2 className="h-7 w-7 shrink-0 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

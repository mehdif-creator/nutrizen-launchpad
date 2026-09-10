import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RENTREE_OFFER, isRentreeOfferActive } from '@/config/landingOffer';
import { cn } from '@/lib/utils';

export const RentreePromotion = ({ placement = 'banner' }: { placement?: 'banner' | 'pricing' }) => {
  const [active, setActive] = useState(isRentreeOfferActive);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const remaining = Date.parse(RENTREE_OFFER.expiresAt) - Date.now();
      setActive(remaining > 0);
      // Long browser timers overflow after ~24 days; recheck daily instead.
      if (remaining > 0) timer = setTimeout(refresh, Math.min(remaining, 86_400_000));
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    if (copyState !== 'copied') return;
    const timer = setTimeout(() => setCopyState('idle'), 3000);
    return () => clearTimeout(timer);
  }, [copyState]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(RENTREE_OFFER.code);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  if (!active) return null;

  return (
    <aside
      aria-label="Offre de rentrée"
      data-rentree-promotion
      className={cn(
        'border-y border-primary/20 bg-secondary text-secondary-foreground',
        placement === 'pricing' && 'mb-10',
      )}
    >
      <div className={cn(
        'flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3 text-center',
        placement === 'banner' ? 'container' : 'px-4 py-5',
      )}>
        <div className="space-y-1">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Ticket className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Votre offre de rentrée
          </p>
          <p className="text-xs">
            Jusqu’au <time dateTime="2026-09-30">{RENTREE_OFFER.deadlineLabel}</time>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Button
            type="button"
            variant="outline"
            className="min-w-[164px] border-dashed border-primary/60 text-foreground"
            onClick={copyCode}
            aria-label={copyState === 'copied' ? 'Code RENTREE50 copié' : 'Copier le code RENTREE50'}
            title="Copier le code RENTREE50"
          >
            <span className="font-mono text-base font-bold tracking-normal">{RENTREE_OFFER.code}</span>
            {copyState === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </Button>
          <p className="max-w-[240px] text-xs" role="status">
            {copyState === 'copied'
              ? 'Code copié ! À saisir au paiement.'
              : copyState === 'error'
                ? 'Copie indisponible : saisissez RENTREE50 au paiement.'
                : 'À saisir dans « Code promotionnel » au paiement.'}
          </p>
        </div>
        {placement === 'banner' && (
          <Button asChild variant="link" className="text-secondary-foreground">
            <a href="#tarifs">Voir les offres <ArrowRight aria-hidden="true" /></a>
          </Button>
        )}
      </div>
    </aside>
  );
};
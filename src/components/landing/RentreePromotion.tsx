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
        'flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center',
        placement === 'banner' ? 'container px-4 py-3 max-md:grid max-md:h-[78px] max-md:grid-cols-[1fr_auto] max-md:grid-rows-[42px_16px] max-md:gap-x-2 max-md:gap-y-1 max-md:px-3.5 max-md:py-2 max-md:text-left' : 'px-4 py-5',
      )}>
        <div className={cn('space-y-1', placement === 'banner' && 'max-md:contents')}>
          <p className="flex items-center justify-center gap-2 text-sm font-semibold max-md:justify-start max-md:text-[13px] max-md:leading-4">
            <Ticket className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Votre offre de rentrée
          </p>
          <p className="text-xs font-normal leading-4 opacity-80 max-md:row-start-2 max-md:self-center max-md:text-[11px]">
            <span className="md:hidden">Jusqu’au <time dateTime="2026-09-30">30/09</time></span>
            <span className="max-md:hidden">Jusqu’au <time dateTime="2026-09-30">{RENTREE_OFFER.deadlineLabel}</time></span>
          </p>
        </div>
        <div className={cn(
          'flex flex-wrap items-center justify-center gap-x-3 gap-y-1',
          placement === 'banner' && 'max-md:col-start-2 max-md:row-start-1 max-md:block max-md:self-center',
        )}>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'min-w-[164px] border-dashed border-primary/60 text-foreground',
              placement === 'banner' && 'max-md:h-11 max-md:min-h-11 max-md:min-w-0 max-md:gap-1.5 max-md:rounded-md max-md:border-solid max-md:px-2.5 max-md:py-1',
            )}
            onClick={copyCode}
            aria-label={copyState === 'copied' ? 'Code RENTREE50 copié' : 'Copier le code RENTREE50'}
            title="Copier le code RENTREE50"
          >
            <span className="font-mono text-base font-bold tracking-normal max-md:text-sm">{RENTREE_OFFER.code}</span>
            {copyState === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </Button>
          <p
            className={cn('max-w-[240px] text-xs', placement === 'banner' && 'max-md:sr-only')}
            role="status"
            aria-live="polite"
          >
            {copyState === 'copied'
              ? 'Code copié ! À saisir au paiement.'
              : copyState === 'error'
                ? 'Copie indisponible : saisissez RENTREE50 au paiement.'
                : 'À saisir dans « Code promotionnel » au paiement.'}
          </p>
        </div>
        {placement === 'banner' && (
          <Button asChild variant="link" className="h-7 min-h-0 px-2 text-[13px] font-medium text-secondary-foreground max-md:col-start-2 max-md:row-start-2 max-md:h-4 max-md:min-h-0 max-md:self-center max-md:p-0 max-md:text-xs md:min-h-10 md:text-sm">
            <a href="#tarifs">Voir les offres <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
          </Button>
        )}
      </div>
    </aside>
  );
};
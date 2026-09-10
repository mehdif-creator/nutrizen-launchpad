import { useEffect, useState } from 'react';
import { Check, Copy, Ticket, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RENTREE_OFFER, isRentreeOfferActive, RECIPE_CATALOG_COPY } from '@/config/landingOffer';

export const HeroTopOffer = () => {
  const [active, setActive] = useState(isRentreeOfferActive);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const remaining = Date.parse(RENTREE_OFFER.expiresAt) - Date.now();
      setActive(remaining > 0);
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

  return (
    <div className="flex flex-wrap items-start gap-3">
      {active && (
        <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 backdrop-blur-sm">
          <Ticket className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-xs font-medium text-white/90">
            Code rentrée <time dateTime="2026-09-30">jusqu'au {RENTREE_OFFER.deadlineLabel}</time>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs font-mono font-bold text-primary hover:bg-primary/20 hover:text-primary"
            onClick={copyCode}
            aria-label={copyState === 'copied' ? 'Code copié' : 'Copier le code'}
          >
            {RENTREE_OFFER.code}
            {copyState === 'copied' ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>
          {copyState === 'error' && (
            <span className="text-xs text-destructive">Copie indisponible</span>
          )}
        </div>
      )}

      <div className="inline-flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
        <div className="text-xs leading-snug">
          <span className="font-semibold text-white">{RECIPE_CATALOG_COPY.title}</span>
          <span className="block text-white/70">{RECIPE_CATALOG_COPY.updates}</span>
        </div>
      </div>
    </div>
  );
};

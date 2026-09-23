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
        <div className="hidden flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 backdrop-blur-sm md:inline-flex">
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

export const MobileHeroPromotion = () => {
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

  if (!active) return null;

  return (
    <div
      className="inline-flex min-h-12 max-w-full items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm md:hidden"
      data-mobile-hero-promotion
    >
      <Ticket className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-[13px] font-semibold leading-4 text-white">
          <span className="whitespace-nowrap">-50 % avec</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 min-h-9 gap-1 px-1.5 font-mono text-[13px] font-bold text-emerald-400 hover:bg-white/10 hover:text-emerald-400"
            onClick={copyCode}
            aria-label={copyState === 'copied' ? 'Code RENTREE50 copié' : 'Copier le code RENTREE50'}
          >
            {RENTREE_OFFER.code}
            {copyState === 'copied' ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>
        </div>
        <p className="text-[11px] leading-3 text-white/70" role="status" aria-live="polite">
          {copyState === 'copied'
            ? 'Code copié'
            : copyState === 'error'
              ? 'Copie indisponible'
              : <><span>Jusqu’au </span><time dateTime="2026-09-30">30 septembre</time></>}
        </p>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RentreePromotion } from '@/components/landing/RentreePromotion';

const STORAGE_KEY = 'nutrizen_announcement_dismissed';

export const AnnouncementBar = () => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // The banner can still be dismissed when browser storage is unavailable.
    }
    setDismissed(true);
  };

  return (
    <>
      <RentreePromotion />
      {!dismissed && (
        <div className="relative hidden min-h-11 items-center justify-center bg-primary py-3 pl-4 pr-14 text-center text-sm leading-normal text-primary-foreground md:flex">
          <span className="max-w-sm sm:max-w-none">
            ✓ Essai gratuit 7 jours — 11 crédits offerts, sans carte bancaire{'  '}·{'  '}✓ Sans
            engagement{'  '}·{'  '}✓ Paiement sécurisé Stripe
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:right-1"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </>
  );
};

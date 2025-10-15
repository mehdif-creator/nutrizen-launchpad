import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg animate-slide-up">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground flex-1">
          Nous utilisons des cookies pour améliorer votre expérience.{' '}
          <a href="/legal/confidentialite" className="underline hover:text-foreground transition-tech">
            En savoir plus
          </a>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={decline}
            className="hover:scale-105 transition-tech"
          >
            Refuser
          </Button>
          <Button
            size="sm"
            onClick={accept}
            className="hover:scale-105 transition-tech"
          >
            Accepter
          </Button>
        </div>
        <button
          onClick={decline}
          className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 p-1 hover:bg-muted rounded transition-tech"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

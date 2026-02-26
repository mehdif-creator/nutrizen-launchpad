import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'nutrizen_announcement_dismissed';

export const AnnouncementBar = () => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-primary text-primary-foreground text-xs sm:text-sm text-center py-2 px-4 relative">
      <span>
        ✓ Essai gratuit sans carte bancaire{'  '}·{'  '}✓ Remboursé si pas satisfait{'  '}·{'  '}✓ Sans engagement
      </span>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

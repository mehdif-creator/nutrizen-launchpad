import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface MobileStickyCTAProps {
  onCtaClick: () => void;
}

export const MobileStickyCTA = ({ onCtaClick }: MobileStickyCTAProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg md:hidden">
      <div className="container flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Check className="w-4 h-4 text-success flex-shrink-0" />
          <span className="text-muted-foreground">Annulable en 3 clics</span>
        </div>
        <Button
          onClick={onCtaClick}
          className="bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech whitespace-nowrap"
        >
          Commencer gratuit
        </Button>
      </div>
    </div>
  );
};

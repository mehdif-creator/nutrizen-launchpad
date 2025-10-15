import { Button } from '@/components/ui/button';

interface FinalCTAProps {
  onCtaClick: () => void;
}

export const FinalCTA = ({ onCtaClick }: FinalCTAProps) => {
  return (
    <section className="py-24 bg-gradient-to-br from-accent/10 to-primary/10">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Dans 7 jours, tu peux déjà avoir une semaine claire dans ton assiette.
          </h2>
          
          <div className="space-y-3">
            <Button
              onClick={onCtaClick}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech text-lg px-12"
            >
              Commencer ma semaine gratuite
            </Button>
            <p className="text-sm text-muted-foreground">
              Aucune carte bancaire requise
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface UrgencyProps {
  onCtaClick: () => void;
}

export const Urgency = ({ onCtaClick }: UrgencyProps) => {
  return (
    <section className="py-16 bg-gradient-to-br from-destructive/10 to-primary/10">
      <div className="container max-w-3xl">
        <div className="text-center p-10 bg-card rounded-2xl shadow-card">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-destructive" />
          <h2 className="text-3xl font-bold mb-4 text-destructive">Offre limitée</h2>
          <p className="text-lg mb-4">
            Seuls les <strong>100 premiers inscrits</strong> profitent de la <strong>valeur complète de 200 €</strong>{" "}
            au tarif de 19,99 €/mois. L'offre pourrait évoluer après cette limite.
          </p>
          <p className="text-lg font-semibold mb-6">
            L'offre se termine dimanche à <strong className="text-destructive">23h59</strong>.
          </p>
          <Button
            onClick={onCtaClick}
            size="lg"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-xl transition-all hover:scale-105"
          >
            Je commence maintenant mon essai gratuit 7 jours
          </Button>
        </div>
      </div>
    </section>
  );
};

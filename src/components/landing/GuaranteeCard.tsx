import { Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const GuaranteeCard = () => {
  return (
    <section className="py-12">
      <div className="container flex justify-center">
        <Card className="max-w-[600px] w-full p-8 text-center border-accent/30 shadow-[0_0_30px_hsl(24_95%_52%/0.15)]">
          <Shield className="w-12 h-12 text-accent mx-auto mb-4" />
          <h3 className="text-xl md:text-2xl font-bold mb-3">
            Satisfait ou remboursé — 30 jours, sans question.
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Si NutriZen ne simplifie pas votre alimentation dans les 30 premiers jours,
            nous vous remboursons intégralement. Un email suffit.
          </p>
          <p className="text-xs text-muted-foreground italic">
            Depuis 2023, moins de 1% de nos utilisateurs ont demandé un remboursement.
          </p>
        </Card>
      </div>
    </section>
  );
};

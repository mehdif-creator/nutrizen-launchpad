import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BillingToggle } from '@/components/landing/BillingToggle';
import { formatEUR, getEffectiveMonthlyPrice, getPlanKey, getTotalPrice, type BillingInterval } from '@/config/pricing';
import type { FinalCTACopy } from '@/config/marketingCopy';

interface FinalCTAProps {
  onCtaClick: () => void;
  copy?: FinalCTACopy;
}

export const FinalCTA = ({ onCtaClick, copy }: FinalCTAProps) => {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<BillingInterval>('month');

  const starterPlanKey = getPlanKey('starter', interval);
  const starterPriceLabel =
    interval === 'year'
      ? `${formatEUR(getTotalPrice('starter', 'year'))}/an`
      : `${formatEUR(getTotalPrice('starter', 'month'))}/mois`;
  const starterSubLabel =
    interval === 'year'
      ? `Soit ${formatEUR(getEffectiveMonthlyPrice('starter', 'year'))}/mois · 2 mois offerts`
      : 'Remboursé si pas satisfait dans les 30 jours';

  return (
    <section className="py-24 bg-gradient-to-br from-accent/10 to-primary/10">
      <div className="container">
        <div className="max-w-4xl mx-auto text-center space-y-10 animate-fade-in">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            {copy?.headline || 'Choisissez votre première étape.'}
          </h2>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free card */}
            <Card className="p-6 border-border text-center space-y-4">
              <p className="font-semibold text-lg">Je teste d'abord</p>
              <Button onClick={onCtaClick} variant="outline" size="lg" className="w-full">
                Commencer gratuitement
              </Button>
              <p className="text-xs text-muted-foreground">Aucune carte bancaire requise</p>
            </Card>

            {/* Paid card */}
            <Card className="p-6 border-2 border-accent text-center space-y-4 shadow-[0_0_20px_hsl(24_95%_52%/0.15)]">
              <p className="font-semibold text-lg">Je me lance vraiment</p>
              <BillingToggle value={interval} onChange={setInterval} className="mx-auto" />
              <Button
                onClick={() => navigate(`/auth/signup?plan=${starterPlanKey}`)}
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-white"
              >
                Commencer — {starterPriceLabel}
              </Button>
              <p className="text-xs text-muted-foreground">
                {starterSubLabel}
              </p>
            </Card>
          </div>

          <p className="text-sm text-muted-foreground">
            {copy?.subtitle ||
              'Rejoignez +12 000 personnes qui ont arrêté de se demander quoi manger ce soir.'}
          </p>
        </div>
      </div>
    </section>
  );
};

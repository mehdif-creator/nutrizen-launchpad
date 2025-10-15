import { Shield, Lock, Award } from 'lucide-react';

export const TrustRow = () => {
  return (
    <section className="py-8 border-y bg-muted/30">
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-5 h-5 text-primary" />
            <span>Conforme RGPD</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-5 h-5 text-primary" />
            <span>Paiement sécurisé Stripe</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award className="w-5 h-5 text-primary" />
            <span>Validé par diététicien(ne)</span>
          </div>
        </div>
      </div>
    </section>
  );
};

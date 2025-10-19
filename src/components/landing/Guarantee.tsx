import { ShieldCheck } from 'lucide-react';

export const Guarantee = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container max-w-3xl">
        <div className="text-center p-10 bg-card rounded-2xl shadow-card">
          <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-4 text-primary">Garantie Zéro-Stress</h2>
          <p className="text-lg text-muted-foreground">
            Si après 30 jours tu n'as pas gagné <strong>au moins 5 heures de liberté par semaine</strong>, on t'offre 1 mois supplémentaire gratuitement. Sans condition compliquée.
          </p>
        </div>
      </div>
    </section>
  );
};

import { ShieldCheck } from 'lucide-react';

export const Guarantee = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container max-w-3xl">
        <div className="text-center p-10 bg-card rounded-2xl shadow-card">
          <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-4 text-primary">Garantie Satisfait ou remboursé</h2>
          <p className="text-lg text-muted-foreground">
            Si après 30 jours d'utilisation, tu constates que tu n'as pas gagné de temps avec NutriZen, contacte-nous. Nous te remboursons intégralement, sans questions compliquées.
          </p>
        </div>
      </div>
    </section>
  );
};

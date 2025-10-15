import { Card } from '@/components/ui/card';

export const EconomicComparison = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Tes économies avec NutriZen
          </h2>

          <Card className="p-8 bg-gradient-to-br from-blue-50 to-green-50 border-primary/20 shadow-card mb-6">
            <div className="grid md:grid-cols-2 gap-8 mb-6">
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-2">Sans NutriZen</div>
                <div className="text-3xl md:text-4xl font-bold text-destructive mb-2">
                  ~400€/mois
                </div>
                <div className="text-sm text-muted-foreground">
                  (Uber Eats + restos)
                </div>
              </div>

              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-2">Avec NutriZen Équilibre</div>
                <div className="text-3xl md:text-4xl font-bold text-success mb-2">
                  ~200€/mois
                </div>
                <div className="text-sm text-muted-foreground">
                  (courses + abonnement)
                </div>
              </div>
            </div>

            <div className="border-t border-primary/20 pt-6 space-y-3">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-2xl">💰</span>
                <span className="font-bold text-lg">
                  Économie : ~200€/mois (2 400€/an)
                </span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-2xl">🩺</span>
                <span className="font-bold text-lg">
                  + 200€/mois économisés sur les consultations nutritionnistes
                </span>
              </div>
            </div>
          </Card>

          <div className="text-center p-6 bg-primary/5 rounded-2xl">
            <p className="text-xl font-bold text-primary">
              Total : ≈ 400€/mois d'économies
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Soit 4 800€ économisés par an
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export const ValueStack = () => {
  return (
    <section className="py-16">
      <div className="container max-w-4xl">
        <div className="bg-card rounded-2xl shadow-card p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-primary">
            Ce que tu obtiens (valeur perçue)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full mb-8">
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">Plan personnalisé 30 jours</td>
                  <td className="py-4 text-right text-primary font-semibold">49 €</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">Swap libre 1/jour</td>
                  <td className="py-4 text-right text-primary font-semibold">19 €</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">Fonction "InspiFrigo" (bonus early)</td>
                  <td className="py-4 text-right text-primary font-semibold">29 €</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">Accès complet app MyNutrizen</td>
                  <td className="py-4 text-right text-primary font-semibold">19 €</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">Bonus PDF "15 repas express équilibrés"</td>
                  <td className="py-4 text-right text-primary font-semibold">9 €</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">10 crédits offerts (swap/inspi/scan)</td>
                  <td className="py-4 text-right text-primary font-semibold">10 €</td>
                </tr>
                <tr className="border-t-2 border-primary/50">
                  <td className="py-4 pr-4 text-left font-bold text-lg">Total valeur perçue</td>
                  <td className="py-4 text-right text-primary font-bold text-xl">≈ 135 €</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center text-2xl font-bold">
            Ton tarif : <span className="text-primary">19,99 €/mois</span>{' '}
            <span className="text-base font-normal text-muted-foreground">(Essai gratuit 7 jours)</span>
          </p>
        </div>
      </div>
    </section>
  );
};

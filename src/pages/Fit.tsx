import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Target, Zap, ShieldCheck, MessageCircle, AlertCircle } from "lucide-react";
import { useReferralTracking } from "@/hooks/useReferralTracking";

export default function Fit() {
  const navigate = useNavigate();

  // Track referral codes from URL
  useReferralTracking();

  const handleCtaClick = () => {
    navigate("/auth/signup");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Header onCtaClick={handleCtaClick} />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 md:py-28">
          <div className="container max-w-4xl">
            <div className="text-center space-y-6 animate-fade-in">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Atteins ta meilleure forme — ton plan repas « Fit » en 30 jours
              </h1>
              <div className="space-y-3 text-lg md:text-xl text-muted-foreground">
                <p>✅ Menus optimisés pour ta performance</p>
                <p>✅ Adapté à ton entraînement & à ton objectif</p>
                <p>✅ Résultat visible ou 1 mois offert</p>
              </div>
              <p className="text-base md:text-lg font-medium pt-4">
                Essai gratuit 7 jours + bonus «10 swaps premium».
                <br />
                <span className="text-primary font-bold">Offre spéciale jusqu'à dimanche minuit.</span>
              </p>
              <Button
                onClick={handleCtaClick}
                size="lg"
                className="mt-6 bg-primary hover:bg-primary/90 text-white text-lg px-8 py-6 rounded-xl transition-all hover:scale-105"
              >
                Je commence mon essai gratuit 7 jours
              </Button>
            </div>
          </div>
        </section>

        {/* 3 Steps */}
        <section className="py-16 bg-background">
          <div className="container max-w-6xl">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-card rounded-2xl shadow-card card-hover">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-4">Définis ton profil fitness</h3>
                <p className="text-muted-foreground">
                  Entraînement, objectif (force / sèche / tonification), préférences alimentaires.
                </p>
              </div>

              <div className="text-center p-8 bg-card rounded-2xl shadow-card card-hover">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Dumbbell className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-4">Reçois ton menu « Fit » automatisé</h3>
                <p className="text-muted-foreground">
                  Chaque jour un plan repas complet, aligné avec ton programme sportif.
                </p>
              </div>

              <div className="text-center p-8 bg-card rounded-2xl shadow-card card-hover">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-4">Swap premium illimité & perf</h3>
                <p className="text-muted-foreground">
                  Un plat ne te plaît pas ? Re-choisis-le en version « macro-optimisée ». Zéro stress.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Value Stack */}
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
                      <td className="py-4 pr-4 text-left">Plan « Fit » 30 jours personnalisé</td>
                      <td className="py-4 text-right text-primary font-semibold">69 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Swap premium 1/jour</td>
                      <td className="py-4 text-right text-primary font-semibold">29 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Module « Macros + Performance »</td>
                      <td className="py-4 text-right text-primary font-semibold">39 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Accès complet app MyNutrizen</td>
                      <td className="py-4 text-right text-primary font-semibold">19 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Bonus PDF « 10 repas performance rapide »</td>
                      <td className="py-4 text-right text-primary font-semibold">9 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">8 crédits premium (swap/inspi/scan)</td>
                      <td className="py-4 text-right text-primary font-semibold">14 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Garantie « Résultat ou mois gratuit »</td>
                      <td className="py-4 text-right text-primary font-semibold">40 €</td>
                    </tr>
                    <tr className="border-t-2 border-primary/50">
                      <td className="py-4 pr-4 text-left font-bold text-lg">Total valeur perçue</td>
                      <td className="py-4 text-right text-primary font-bold text-xl">≈ 200 €</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-center text-2xl font-bold">
                Ton tarif : <span className="text-primary">19,99 €/mois</span>{" "}
                <span className="text-base font-normal text-muted-foreground">(Essai gratuit 7 jours)</span>
              </p>
            </div>
          </div>
        </section>

        {/* Guarantee */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="container max-w-3xl">
            <div className="text-center p-10 bg-card rounded-2xl shadow-card">
              <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-primary" />
              <h2 className="text-3xl font-bold mb-4 text-primary">Garantie Résultat ou remboursé</h2>
              <p className="text-lg text-muted-foreground">
                Si après 30 jours d'utilisation régulière, tu ne constates aucune amélioration de tes performances ou de
                ta composition corporelle, contacte-nous. Nous te remboursons intégralement.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">Témoignages</h2>
            <div className="space-y-6">
              <div className="bg-card rounded-2xl shadow-card p-8 hover:shadow-lg transition-shadow">
                <MessageCircle className="w-8 h-8 text-primary mb-4" />
                <p className="text-lg mb-4">
                  « J'ai gagné 2 kg de muscle en 4 semaines – MyNutrizen Fit a simplifié ma nourriture ET mon training.
                  »
                </p>
                <p className="text-sm text-muted-foreground">— Alex R.</p>
              </div>

              <div className="bg-card rounded-2xl shadow-card p-8 hover:shadow-lg transition-shadow">
                <MessageCircle className="w-8 h-8 text-primary mb-4" />
                <p className="text-lg mb-4">
                  « Le swap «macro-optimisé» est une bombe : je change un plat et reste dans mes macros sans m'en
                  soucier. »
                </p>
                <p className="text-sm text-muted-foreground">— Laura S.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-muted/30">
          <div className="container max-w-4xl">
            <div className="bg-card rounded-2xl shadow-card p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-primary">FAQ</h2>
              <dl className="space-y-6">
                <div>
                  <dt className="font-bold text-lg mb-2">Dois-je compter mes macros moi-même ?</dt>
                  <dd className="text-muted-foreground pl-4">
                    Non – Ton plan Fit génère les menus selon ton objectif + ton entraînement, tout est automatisé.
                  </dd>
                </div>

                <div>
                  <dt className="font-bold text-lg mb-2">Puis-je adapter végétarien / végan ?</dt>
                  <dd className="text-muted-foreground pl-4">
                    Oui – Indique tes préférences/allergies dans l'onboarding et tout est déjà filtré.
                  </dd>
                </div>

                <div>
                  <dt className="font-bold text-lg mb-2">Et après les 30 jours ?</dt>
                  <dd className="text-muted-foreground pl-4">
                    Le plan continue, tu peux changer d'objectif (par ex. "maintien" ou "prise de masse") sans perdre
                    ton historique.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Urgency */}
        <section className="py-16 bg-gradient-to-br from-destructive/10 to-primary/10">
          <div className="container max-w-3xl">
            <div className="text-center p-10 bg-card rounded-2xl shadow-card">
              <AlertCircle className="w-16 h-16 mx-auto mb-6 text-destructive" />
              <h2 className="text-3xl font-bold mb-4 text-destructive">Offre limitée</h2>
              <p className="text-lg mb-4">
                Seuls les <strong>50 premiers inscrits Fit</strong> bénéficient de la{" "}
                <strong>valeur complète de 200 €</strong> au tarif de 19,99 €/mois. L'offre pourrait évoluer après cette
                limite.
              </p>
              <p className="text-lg font-semibold mb-6">
                L'offre se termine dimanche à <strong className="text-destructive">23h59</strong>.
              </p>
              <Button
                onClick={handleCtaClick}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white text-lg px-8 py-6 rounded-xl transition-all hover:scale-105"
              >
                Je commence mon essai gratuit 7 jours
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16">
          <div className="container text-center">
            <Button
              onClick={handleCtaClick}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-xl px-12 py-8 rounded-xl transition-all hover:scale-105 shadow-lg"
            >
              Commencer mon essai gratuit maintenant
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, Target, Sparkles, ShieldCheck, MessageCircle, AlertCircle } from "lucide-react";
import { useReferralTracking } from "@/hooks/useReferralTracking";

export default function Mum() {
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
                Retrouve ton énergie, même avec bébé — ton plan repas « Mum » en 30 jours
              </h1>
              <div className="space-y-3 text-lg md:text-xl text-muted-foreground">
                <p>✅ Menus simples & rapides adaptés aux mamans</p>
                <p>✅ Sans culpabilité, sans prise de tête, même entre deux biberons</p>
                <p>✅ Résultat visible ou 1 mois offert</p>
              </div>
              <p className="text-base md:text-lg font-medium pt-4">
                Essai gratuit 7 jours + bonus «5 swaps maman».
                <br />
                <span className="text-accent font-bold">Offre spéciale jusqu'à dimanche minuit.</span>
              </p>
              <Button
                onClick={handleCtaClick}
                size="lg"
                className="mt-6 bg-accent hover:bg-accent/90 text-white text-lg px-8 py-6 rounded-xl transition-all hover:scale-105"
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
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                  <Target className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-4">Onboarding rapide : ton style, ton rythme, ton bébé</h3>
                <p className="text-muted-foreground">Objectifs, contraintes, préférences — on adapte tout.</p>
              </div>

              <div className="text-center p-8 bg-card rounded-2xl shadow-card card-hover">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-4">Chaque jour ton menu « Mum » généré</h3>
                <p className="text-muted-foreground">
                  Des repas équilibrés, rapides, pensés pour les mamans débordées.
                </p>
              </div>

              <div className="text-center p-8 bg-card rounded-2xl shadow-card card-hover">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-4">Swap maman & récup facile</h3>
                <p className="text-muted-foreground">
                  Un repas ne te plaît pas ? Change-le en version «rapide + nourrissante». Zéro prise de tête.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Value Stack */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <div className="bg-card rounded-2xl shadow-card p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-accent">Ce que tu obtiens</h2>
              <div className="overflow-x-auto">
                <table className="w-full mb-8">
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Plan « Mum » 30 jours personnalisé</td>
                      <td className="py-4 text-right text-accent font-semibold">59 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Swap spécial mamans 1/jour</td>
                      <td className="py-4 text-right text-accent font-semibold">19 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Module « Boost énergie & récupération »</td>
                      <td className="py-4 text-right text-accent font-semibold">39 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Accès complet app MyNutrizen</td>
                      <td className="py-4 text-right text-accent font-semibold">19 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Bonus PDF « 10 repas super-maman express »</td>
                      <td className="py-4 text-right text-accent font-semibold">9 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">12 crédits maman (swap/inspi/scan)</td>
                      <td className="py-4 text-right text-accent font-semibold">14 €</td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 pr-4 text-left">Garantie « Plus d'énergie ou mois gratuit »</td>
                      <td className="py-4 text-right text-accent font-semibold">40 €</td>
                    </tr>
                    <tr className="border-t-2 border-accent/50">
                      <td className="py-4 pr-4 text-left font-bold text-lg">Total valeur perçue</td>
                      <td className="py-4 text-right text-accent font-bold text-xl">≈ 200 €</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-center text-2xl font-bold">
                Ton tarif : <span className="text-accent">19,99 €/mois</span>{" "}
                <span className="text-base font-normal text-muted-foreground">(Essai gratuit 7 jours)</span>
              </p>
            </div>
          </div>
        </section>

        {/* Guarantee */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="container max-w-3xl">
            <div className="text-center p-10 bg-card rounded-2xl shadow-card">
              <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-accent" />
              <h2 className="text-3xl font-bold mb-4 text-accent">Garantie Énergie ou remboursé</h2>
              <p className="text-lg text-muted-foreground">
                Si après 30 jours d'utilisation, tu ne te sens pas plus énergique et sereine avec NutriZen Mum,
                contacte-nous. Nous te remboursons intégralement, sans condition compliquée.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-accent">Témoignages</h2>
            <div className="space-y-6">
              <div className="bg-card rounded-2xl shadow-card p-8 hover:shadow-lg transition-shadow">
                <MessageCircle className="w-8 h-8 text-accent mb-4" />
                <p className="text-lg mb-4">
                  « Grâce à MyNutrizen Mum j'ai arrêté de sauter des repas, j'ai plus d'énergie pour jouer avec mon
                  petit, et mes paniers courses sont plus calmes. »
                </p>
                <p className="text-sm text-muted-foreground">— Julie M.</p>
              </div>

              <div className="bg-card rounded-2xl shadow-card p-8 hover:shadow-lg transition-shadow">
                <MessageCircle className="w-8 h-8 text-accent mb-4" />
                <p className="text-lg mb-4">
                  « Menu express entre les rdv / biberons / lessives – je ne pensais pas que ça existait. »
                </p>
                <p className="text-sm text-muted-foreground">— Céline T.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-muted/30">
          <div className="container max-w-4xl">
            <div className="bg-card rounded-2xl shadow-card p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-accent">FAQ</h2>
              <dl className="space-y-6">
                <div>
                  <dt className="font-bold text-lg mb-2">Puis-je adapter mes menus à l'allaitement / restriction ?</dt>
                  <dd className="text-muted-foreground pl-4">
                    Oui — lors de l'onboarding, mentionne ton statut (allaitement, grossesse, etc.). Les menus sont
                    adaptés.
                  </dd>
                </div>

                <div>
                  <dt className="font-bold text-lg mb-2">Je peux vraiment changer un repas chaque jour ?</dt>
                  <dd className="text-muted-foreground pl-4">
                    Oui – Le swap maman est activé dès le jour 1 : tu changes un repas, version rapide/nourrissante.
                  </dd>
                </div>

                <div>
                  <dt className="font-bold text-lg mb-2">Et après les 30 jours ?</dt>
                  <dd className="text-muted-foreground pl-4">
                    Le plan continue, tu peux rester ou passer à un objectif « maintien », «performance », etc., sans
                    perdre ton historique.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Urgency */}
        <section className="py-16 bg-gradient-to-br from-destructive/10 to-accent/10">
          <div className="container max-w-3xl">
            <div className="text-center p-10 bg-card rounded-2xl shadow-card">
              <AlertCircle className="w-16 h-16 mx-auto mb-6 text-destructive" />
              <h2 className="text-3xl font-bold mb-4 text-destructive">Offre limitée</h2>
              <p className="text-lg mb-4">
                Seuls les <strong>75 premières mamans inscrites</strong> bénéficient de la{" "}
                <strong>valeur complète de 200 €</strong> au tarif de 19,99 €/mois. L'offre pourrait évoluer après cette
                limite.
              </p>
              <p className="text-lg font-semibold mb-6">
                L'offre se termine dimanche à <strong className="text-destructive">23h59</strong>.
              </p>
              <Button
                onClick={handleCtaClick}
                size="lg"
                className="bg-accent hover:bg-accent/90 text-white text-lg px-8 py-6 rounded-xl transition-all hover:scale-105"
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
              className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white text-xl px-12 py-8 rounded-xl transition-all hover:scale-105 shadow-lg"
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

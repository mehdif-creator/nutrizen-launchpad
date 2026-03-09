import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Mail, MessageCircle, Book, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAILTO_LINK = 'mailto:support@mynutrizen.fr?subject=Demande de support NutriZen';

export default function Support() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container py-4 md:py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Aide & Questions fréquentes</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Trouvez rapidement des réponses à vos questions sur NutriZen
            </p>
          </div>

          {/* Contact Card */}
          <Card className="p-4 md:p-6 mb-6 md:mb-8 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2 rounded-full bg-primary/10">
                <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Besoin d'aide ?</h2>
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  Notre équipe est là pour vous accompagner. N'hésitez pas à nous contacter !
                </p>
                <a 
                  href="mailto:support@mynutrizen.fr?subject=Demande%20de%20support%20NutriZen"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground w-full sm:w-auto"
                >
                  <Mail className="h-4 w-4" />
                  support@mynutrizen.fr
                </a>
                <p className="text-xs text-muted-foreground mt-2">
                  Délai de réponse : sous 24h en semaine
                </p>
              </div>
            </div>
          </Card>

          {/* FAQ Sections */}
          <div className="space-y-6 md:space-y-8">
            {/* Bien démarrer */}
            <section>
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Book className="h-5 w-5 text-primary" />
                <h2 className="text-lg md:text-xl font-semibold">Bien démarrer avec NutriZen</h2>
              </div>
              <Card className="p-4 md:p-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Comment remplir mon profil ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      Rendez-vous dans la section "Profil" et complétez vos préférences alimentaires, allergies, 
                      nombre de personnes dans votre foyer, et objectifs. Plus votre profil est complet, 
                      plus vos menus seront personnalisés !
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Comment générer mon premier menu hebdomadaire ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      Cliquez sur "Générer un nouveau menu" depuis le tableau de bord. Notre IA crée 
                      automatiquement un menu complet pour la semaine, adapté à votre famille et vos 
                      préférences. Vous pouvez ensuite l'ajuster avec les swaps si besoin.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Comment utiliser les swaps ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      Sur chaque recette de votre menu, cliquez sur "Swap" pour la remplacer par une 
                      alternative qui vous plaît davantage. Chaque swap coûte 1 crédit. Vous avez des 
                      crédits inclus avec votre abonnement !
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </section>

            {/* Crédits Zen & Gamification */}
            <section>
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg md:text-xl font-semibold">Crédits Zen & Gamification</h2>
              </div>
              <Card className="p-4 md:p-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-4">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Quelle est la différence entre les types de crédits ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Crédits d'abonnement</strong> : Inclus chaque mois avec votre abonnement, 
                        ils se renouvellent automatiquement.</li>
                        <li><strong>Crédits Zen (achetés)</strong> : Achetés en packs (ex: 15 crédits pour 4,99€), 
                        ils ne périment JAMAIS et restent sur votre compte.</li>
                      </ul>
                      <p className="mt-2">Lors de l'utilisation, les crédits d'abonnement sont consommés en premier.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-5">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Comment gagner des points et des badges ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      Vous gagnez des points en utilisant l'application :
                      <ul className="list-disc pl-4 space-y-1 mt-2">
                        <li>Connexion quotidienne : +5 points</li>
                        <li>Profil complété : +20 points</li>
                        <li>Menu généré : +10 points</li>
                        <li>Repas validé : +2 points</li>
                        <li>Utilisation de fonctionnalités (swap, InspiFrigo, etc.) : +1-2 points</li>
                      </ul>
                      <p className="mt-2">Les badges se débloquent automatiquement selon vos actions !</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-6">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Comment fonctionne le parrainage ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      Partagez votre lien de parrainage unique avec vos amis. Pour chaque ami qui s'abonne :
                      <ul className="list-disc pl-4 space-y-1 mt-2">
                        <li>Votre ami reçoit +10 Crédits Zen de bienvenue</li>
                        <li>Vous recevez +20 Crédits Zen bonus</li>
                        <li>Tous les 5 filleuls abonnés, vous gagnez <strong>1 mois gratuit</strong> d'abonnement !</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </section>

            {/* Facturation & Abonnement */}
            <section>
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="text-lg md:text-xl font-semibold">Facturation & Abonnement</h2>
              </div>
              <Card className="p-4 md:p-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-7">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Comment voir ou modifier mon abonnement ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      Rendez-vous dans "Paramètres" puis cliquez sur "Gérer mon abonnement". Vous serez redirigé 
                      vers le portail Stripe où vous pouvez modifier votre moyen de paiement, voir vos 
                      factures et gérer votre abonnement en toute autonomie.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-8">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Comment annuler mon abonnement ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      Vous pouvez annuler à tout moment depuis "Paramètres" → "Gérer mon abonnement". 
                      Votre abonnement reste actif jusqu'à la fin de la période payée. Vos Crédits Zen 
                      achetés restent disponibles même après annulation.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-9">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Où trouver mes factures ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      Toutes vos factures sont accessibles dans le portail de gestion d'abonnement 
                      (Paramètres → Gérer mon abonnement). Vous pouvez les télécharger au format PDF.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-10">
                    <AccordionTrigger className="text-sm md:text-base text-left">
                      Comment utiliser mes mois gratuits gagnés par parrainage ?
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      Vos mois gratuits s'appliquent automatiquement lors de vos prochains 
                      renouvellements d'abonnement. Vous verrez le décompte dans votre tableau de bord 
                      gamification. Aucune action de votre part n'est nécessaire !
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </section>
          </div>

          {/* Additional Help */}
          <Card className="mt-6 md:mt-8 p-4 md:p-6 bg-muted/30">
            <h3 className="text-base md:text-lg font-semibold mb-2">Vous ne trouvez pas la réponse ?</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-4">
              Notre équipe est là pour vous aider. Envoyez-nous un email avec le maximum de détails 
              sur votre question, et nous vous répondrons dans les plus brefs délais.
            </p>
            <a 
              href="mailto:support@mynutrizen.fr?subject=Demande%20de%20support%20NutriZen"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 w-full sm:w-auto"
            >
              <Mail className="h-4 w-4" />
              Contacter le support
            </a>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

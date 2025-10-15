import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const FAQ = () => {
  const faqs = [
    {
      question: 'Comment fonctionne l\'essai gratuit ?',
      answer:
        'Première semaine 100% gratuite, sans carte bancaire. Tu peux générer ton premier plan hebdo immédiatement. À la fin de la semaine, choisis ton plan ou arrête — aucun engagement.'
    },
    {
      question: 'Puis-je annuler à tout moment ?',
      answer:
        'Oui, résiliation en 3 clics depuis ton espace. Conforme à la réglementation française. Aucune justification demandée, aucun frais de résiliation.'
    },
    {
      question: 'Est-ce que je peux adapter les recettes ?',
      answer:
        'Absolument. Utilise tes swaps pour remplacer un repas par un autre de macros similaires. Tu peux aussi ajuster les portions et allergènes dans les préférences.'
    },
    {
      question: 'Comment sont calculés les besoins caloriques ?',
      answer:
        'On utilise une formule validée (Harris-Benedict ajustée) selon ton poids, taille, activité. Un(e) diététicien(ne) a supervisé notre algorithme. Disclaimer : NutriZen est un assistant d\'organisation, pas un professionnel de santé.'
    },
    {
      question: 'Que se passe-t-il avec mes données ?',
      answer:
        'Tes données sont hébergées en UE (RGPD). Tu peux les exporter ou supprimer à tout moment. On ne partage rien à des tiers. Voir notre Politique de confidentialité pour les détails.'
    },
    {
      question: 'Puis-je utiliser NutriZen pour toute ma famille ?',
      answer:
        'Chaque compte est personnel (objectifs individuels). Pour plusieurs profils, il faudra plusieurs comptes. On travaille sur un plan "Famille" — reste informé(e) via notre roadmap.'
    },
    {
      question: 'Y a-t-il des recettes végétariennes / vegan ?',
      answer:
        'Oui ! Pendant l\'onboarding, tu précises tes préférences alimentaires (végétarien, vegan, sans gluten, etc.). Les menus s\'adaptent automatiquement.'
    },
    {
      question: 'La garantie "temps gagné", c\'est quoi ?',
      answer:
        'Si après 30 jours tu n\'as pas gagné de temps vs. ton organisation précédente, on te rembourse intégralement. Simple mail au support avec retour sous 48h.'
    }
  ];

  return (
    <section id="faq" className="py-16 bg-background">
      <div className="container max-w-3xl">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Questions fréquentes
          </h2>
          <p className="text-lg text-muted-foreground">
            Tout ce que tu dois savoir sur NutriZen
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

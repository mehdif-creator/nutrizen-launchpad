import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const FAQ = () => {
  const faqs = [
    {
      question: 'Comment fonctionne la semaine gratuite ?',
      answer: 'Inscris-toi en 60 secondes, sans carte bancaire. Tu accèdes immédiatement à toutes les fonctionnalités pendant 7 jours. À la fin de l\'essai, tu choisis si tu continues.'
    },
    {
      question: 'Puis-je annuler à tout moment ?',
      answer: 'Oui, en 3 clics depuis ton compte. Pas de frais cachés, pas de reconduction forcée. Tu peux annuler à tout moment.'
    },
    {
      question: 'Qu\'est-ce qu\'un "swap" ?',
      answer: 'Un swap te permet de remplacer un repas que tu n\'aimes pas par un autre, en 1 clic. Les swaps sont limités selon ton plan (3, 10 ou illimités).'
    },
    {
      question: 'Comment fonctionne la garantie 30 jours ?',
      answer: 'Si tu ne gagnes pas de temps après 30 jours d\'utilisation, écris-nous et on te rembourse intégralement. Simple et honnête.'
    },
    {
      question: 'Les recettes conviennent-elles aux débutants ?',
      answer: 'Absolument. Toutes les recettes sont pensées pour être réalisées en 20–30 min max, avec des ingrédients courants et des étapes simples.'
    },
    {
      question: 'Comment gérer les allergies/régimes spéciaux ?',
      answer: 'Tu indiques tes allergies et préférences lors de l\'onboarding. L\'IA adapte automatiquement les suggestions (végétarien, sans gluten, sans lactose, etc.).'
    },
    {
      question: 'Puis-je utiliser NutriZen pour ma famille/enfants ?',
      answer: 'Oui ! Tu peux adapter les portions et générer des plans pour plusieurs personnes. Les recettes sont équilibrées et conviennent à toute la famille.'
    },
    {
      question: 'Est-ce que mes données sont sécurisées (RGPD) ?',
      answer: 'Oui, nous sommes conformes RGPD. Tes données sont cryptées et jamais partagées avec des tiers. Tu peux exporter ou supprimer tes données à tout moment.'
    },
    {
      question: 'C\'est validé par des professionnels ?',
      answer: 'Oui. Toutes nos recettes et notre méthodologie sont validées par un(e) diététicien(ne) diplômé(e). NutriZen est un assistant d\'organisation, pas un outil médical.'
    },
    {
      question: 'Comment contacter le support ?',
      answer: 'Écris-nous à support@nutrizen.app ou via le chat dans l\'app. Temps de réponse : <24h (plan Essentiel), <8h (Premium).'
    },
    {
      question: 'Les paiements sont-ils sécurisés ?',
      answer: 'Oui, nous utilisons Stripe (leader mondial) pour tous les paiements. Tes données bancaires ne transitent jamais par nos serveurs.'
    },
    {
      question: 'Quelle est la différence entre les plans ?',
      answer: 'Essentiel (30 repas/mois, 3 swaps) pour tester. Équilibre (60 repas, 10 swaps, batch-cooking) pour une utilisation régulière. Premium (120 repas, swaps illimités, coaching) pour les plus engagés.'
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

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const FAQ = () => {
  const leftColumnFaqs = [
    {
      question: "Qu'est-ce qui est gratuit ?",
      answer: "Le compte gratuit inclut : génération de menus hebdomadaires personnalisés, accès à toutes les recettes avec instructions détaillées, calcul automatique des macros, liste de courses intelligente, tableau de bord personnel et historique de tes menus. Tu peux utiliser NutriZen gratuitement aussi longtemps que tu veux."
    },
    {
      question: 'Comment fonctionnent les Crédits Zen ?',
      answer: "Les Crédits Zen te permettent de débloquer des fonctionnalités avancées à la demande : changer une recette (1 crédit), analyser ton frigo avec InspiFrigo (2 crédits), analyser un repas avec ScanRepas (2 crédits), ou suggérer des substitutions d'ingrédients (1 crédit). Tu achètes des packs une seule fois, pas d'abonnement."
    },
    {
      question: 'Les Crédits Zen expirent-ils ?',
      answer: "Non ! Les crédits que tu achètes n'expirent jamais. Tu peux les utiliser quand tu veux, sans pression. C'est un paiement unique, pas un abonnement récurrent."
    },
    {
      question: "Qu'en est-il de mes préférences & allergies ?",
      answer: "Lors de l'onboarding, tu indiques tes goûts, exclusions & objectifs → menus adaptés. Tu peux indiquer tes allergies et restrictions alimentaires (végétarien, sans gluten, etc.). NutriZen adapte automatiquement tous les menus proposés."
    },
    {
      question: 'Je peux changer un repas chaque jour ?',
      answer: 'Oui – Le swap te permet de remplacer un repas du menu par un autre en 1 clic. Cette fonctionnalité utilise 1 Crédit Zen par swap. Simple et rapide.'
    },
    {
      question: 'Les recettes conviennent-elles aux débutants ?',
      answer: 'Absolument ! Toutes nos recettes sont conçues pour être simples et rapides (20-30 minutes en moyenne). Chaque étape est détaillée clairement, parfait pour tous les niveaux.'
    },
  ];

  const rightColumnFaqs = [
    {
      question: 'Puis-je utiliser NutriZen pour ma famille ?',
      answer: 'Oui, NutriZen peut générer des menus adaptés pour toute la famille. Tu peux ajuster les portions et les préférences alimentaires pour inclure les enfants. Le compte gratuit suffit pour cette utilisation.'
    },
    {
      question: 'Comment gérer les allergies / régimes spéciaux ?',
      answer: 'Lors de ton inscription, tu peux indiquer tes allergies et restrictions alimentaires (végétarien, sans gluten, etc.). NutriZen adapte automatiquement tous les menus proposés.'
    },
    {
      question: 'Est-ce végétarien-friendly ?',
      answer: "Oui ! Tu peux choisir l'option végétarienne lors de ton inscription et toutes les recettes proposées seront 100% végétariennes. Tu peux aussi filtrer par type de régime."
    },
    {
      question: 'Est-ce que mes données sont sécurisées (RGPD) ?',
      answer: 'Totalement. Nous sommes conformes RGPD. Tes données personnelles ne sont ni vendues ni partagées. Elles servent uniquement à personnaliser tes menus.'
    },
    {
      question: "C'est validé par des professionnels ?",
      answer: "Oui. Nos recettes et équilibres nutritionnels sont validés par un(e) diététicien(ne) diplômé(e). Toutefois, NutriZen n'est pas un service médical : il ne remplace pas un suivi personnalisé par un professionnel de santé."
    },
    {
      question: 'Comment contacter le support ?',
      answer: 'Tu peux nous contacter via le formulaire de contact sur le site, par email à support@nutrizen.fr, ou directement depuis ton espace membre. Nous répondons sous 24h en moyenne.'
    },
  ];

  return (
    <section id="faq" className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Questions fréquentes
          </h2>
          <p className="text-lg text-muted-foreground">
            Tout ce que tu dois savoir avant de commencer
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Left Column */}
          <div>
            <Accordion type="single" collapsible>
              {leftColumnFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`left-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Right Column */}
          <div>
            <Accordion type="single" collapsible>
              {rightColumnFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`right-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

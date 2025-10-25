import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';

export const FAQ = () => {
  const { t } = useLanguage();
  
  const leftColumnFaqs = [
    {
      question: 'Puis-je annuler à tout moment ?',
      answer: 'Oui ! Essai gratuit 7 jours, abonnement mensuel ensuite, aucune obligation. Ton abonnement est résiliable en 3 clics depuis ton profil. Aucune pénalité, aucune condition.'
    },
    {
      question: 'Qu\'en est-il de mes préférences & allergies ?',
      answer: 'Lors de l\'onboarding, tu indiques tes goûts, exclusions & objectifs → menus adaptés. Tu peux indiquer tes allergies et restrictions alimentaires (végétarien, sans gluten, etc.). NutriZen adapte automatiquement tous les menus proposés.'
    },
    {
      question: 'Je peux changer un repas chaque jour ?',
      answer: 'Oui – Le swap libre est actif dès le jour 1 : tu changes ce que TU veux. Un swap te permet de remplacer un repas du menu par un autre de ton choix en 1 clic. Simple et rapide.'
    },
    {
      question: 'Est-ce comme une "diète" ?',
      answer: 'Non : ce n\'est pas une diète rigide mais un système automatisé intelligent. Mange ce que tu veux (dans les limites de ton profil) sans stress. NutriZen s\'adapte à ton style de vie, pas l\'inverse.'
    },
    {
      question: 'Les recettes conviennent-elles aux débutants ?',
      answer: 'Absolument ! Toutes nos recettes sont conçues pour être simples et rapides (20-30 minutes en moyenne). Chaque étape est détaillée clairement, parfait pour tous les niveaux.'
    },
    {
      question: 'Puis-je utiliser NutriZen pour ma famille/enfants ?',
      answer: 'Oui, NutriZen peut générer des menus adaptés pour toute la famille. Tu peux ajuster les portions et les préférences alimentaires pour inclure les enfants.'
    },
  ];

  const rightColumnFaqs = [
    {
      question: 'Comment gérer les allergies/régimes spéciaux ?',
      answer: 'Lors de ton inscription, tu peux indiquer tes allergies et restrictions alimentaires (végétarien, sans gluten, etc.). NutriZen adapte automatiquement tous les menus proposés.'
    },
    {
      question: 'Est-ce végétarien-friendly ?',
      answer: 'Oui ! Tu peux choisir l\'option végétarienne lors de ton inscription et toutes les recettes proposées seront 100% végétariennes. Tu peux aussi filtrer par type de régime.'
    },
    {
      question: 'Est-ce que mes données sont sécurisées (RGPD) ?',
      answer: 'Totalement. Nous sommes conformes RGPD. Tes données personnelles ne sont ni vendues ni partagées. Elles servent uniquement à personnaliser tes menus.'
    },
    {
      question: 'C\'est validé par des professionnels ?',
      answer: 'Oui. Nos recettes et équilibres nutritionnels sont validés par un(e) diététicien(ne) diplômé(e). Toutefois, NutriZen n\'est pas un service médical : il ne remplace pas un suivi personnalisé par un professionnel de santé.'
    },
    {
      question: 'Comment contacter le support ?',
      answer: 'Tu peux nous contacter via le formulaire de contact sur le site, par email à support@nutrizen.fr, ou directement depuis ton espace membre. Nous répondons sous 24h en moyenne.'
    },
    {
      question: 'Les paiements sont-ils sécurisés ?',
      answer: 'Oui, tous les paiements sont sécurisés via Stripe, leader mondial du paiement en ligne. Nous ne stockons aucune information bancaire.'
    },
  ];

  return (
    <section id="faq" className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('faq.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('faq.subtitle')}
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

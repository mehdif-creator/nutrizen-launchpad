/**
 * Per-page marketing copy for NutriZen offer pages.
 * Each page has distinct, persona-specific copy.
 */

export interface HeroCopy {
  badge: string;
  h1: string;
  subtitle: string;
  bullets: { icon: 'heart' | 'shopping' | 'clock' | 'zap'; bold: string; text: string }[];
  primaryCta: string;
  secondaryCta: string;
  secondaryAction: 'example' | 'quiz';
  socialProof?: string;
  socialProofSuffix?: string;
  heroImage?: string;
  heroImageAlt?: string;
  floatingTop?: { value: string; label: string };
  floatingBottom?: { value: string; label: string };
  trustLine?: string;
}

export interface BenefitsCopy {
  title: string;
  cards: { title: string; result: string; description: string }[];
}

export interface HowItWorksCopy {
  title: string;
  subtitle: string;
  steps: { title: string; description: string }[];
}

export interface FAQCopy {
  items: { question: string; answer: string }[];
}

export interface LeadMagnetCopy {
  title: string;
  text: string;
  cta: string;
  source: string;
}

export interface FinalCTACopy {
  headline: string;
  button: string;
  subtitle?: string;
}

export interface PageMarketingCopy {
  seo: { title: string; description: string };
  hero: HeroCopy;
  benefits: BenefitsCopy;
  howItWorks: HowItWorksCopy;
  faq: FAQCopy;
  leadMagnet: LeadMagnetCopy;
  finalCta: FinalCTACopy;
}

// =====================================================
// MAIN (Home)
// =====================================================
export const mainCopy: PageMarketingCopy = {
  seo: {
    title: 'NutriZen — Arrêtez de vous demander quoi manger ce soir',
    description: 'NutriZen génère vos menus de la semaine en 2 minutes — adaptés à vos goûts, contraintes et budget. Liste de courses incluse. Gratuit pour commencer.',
  },
  hero: {
    badge: 'Planification repas · Sans régime · Sans prise de tête',
    h1: 'Arrêtez de vous demander\nquoi manger ce soir.',
    subtitle: 'NutriZen génère vos menus de la semaine en 2 minutes — adaptés à vos goûts, vos contraintes et votre budget. Fini les décisions inutiles. Fini le gaspillage. Juste des repas qui vous correspondent.',
    bullets: [
      { icon: 'heart', bold: 'Menus 7j/semaine', text: 'générés selon vos préférences' },
      { icon: 'shopping', bold: 'Liste de courses prête', text: '— zéro oubli, zéro gaspillage' },
      { icon: 'zap', bold: 'Macros et apports calculés', text: 'sans effort de votre part' },
      { icon: 'clock', bold: '+40 préférences', text: ': végétarien, sans gluten, intolérance lactose...' },
    ],
    primaryCta: 'Créer mon premier menu gratuitement →',
    secondaryCta: 'Voir un exemple de menu complet',
    secondaryAction: 'example',
    socialProof: '+12 000 utilisateurs',
    socialProofSuffix: 'ont simplifié leurs repas',
    heroImage: '/img/hero-default.png',
    heroImageAlt: 'Interface NutriZen avec un menu de la semaine',
    floatingTop: { value: '2 min', label: 'Menu personnalisé' },
    floatingBottom: { value: '200€', label: 'Économisés/mois' },
    trustLine: '⭐ 4.8/5  ·  +12 000 utilisateurs  ·  Aucune carte bancaire  ·  Annulable à tout moment',
  },
  benefits: {
    title: 'Pourquoi choisir NutriZen ?',
    cards: [
      { title: 'Zéro charge mentale', result: 'Fini le stress des repas', description: 'Vous passez de "qu\'est-ce qu\'on mange ?" à "c\'est prêt" sans friction.' },
      { title: 'Moins de gaspillage', result: 'Achats optimisés', description: 'Achats plus propres, ingrédients réutilisés sur plusieurs recettes.' },
      { title: 'Réalisme avant perfection', result: 'Recettes tenables', description: 'Recettes simples, ajustables, faites pour tenir dans un planning.' },
    ],
  },
  howItWorks: {
    title: 'Comment ça marche ?',
    subtitle: '3 étapes simples pour simplifier vos repas',
    steps: [
      { title: 'Renseignez vos contraintes', description: 'Goûts, allergies, temps, budget : 45 secondes et c\'est fait.' },
      { title: 'Recevez votre plan repas', description: 'Menus + recettes + liste de courses, prêt à utiliser.' },
      { title: 'Ajustez en 1 clic', description: 'Remplacez un repas, modifiez une recette, régénérez quand vous voulez.' },
    ],
  },
  faq: {
    items: [
      { question: 'C\'est quoi la différence avec chercher des recettes sur Google ?', answer: 'Google vous donne des recettes. NutriZen vous donne une semaine complète : menus équilibrés, liste de courses et macros — pensés ensemble, en 2 minutes.' },
      { question: 'Est-ce que ça marche si j\'ai des restrictions alimentaires ?', answer: 'Oui. NutriZen gère plus de 40 préférences : végétarien, vegan, sans gluten, sans lactose, sans porc, et bien d\'autres. Vous les configurez une fois.' },
      { question: 'Je ne suis pas très cuisinier(e), les recettes sont accessibles ?', answer: 'Toutes les recettes sont notées par niveau. La majorité sont réalisables en moins de 30 minutes avec des ingrédients courants.' },
      { question: 'Est-ce que je peux l\'utiliser pour toute ma famille ?', answer: 'Oui. Vous indiquez le nombre de personnes et leurs préférences individuelles. Les portions sont ajustées automatiquement.' },
      { question: 'Je peux annuler à tout moment ?', answer: 'Oui, sans préavis, depuis votre espace personnel. Pas de formulaire, pas d\'email à envoyer.' },
      { question: 'Combien de temps ça prend vraiment par semaine ?', answer: 'La plupart de nos utilisateurs passent entre 5 et 10 minutes le dimanche pour valider leur menu de la semaine. C\'est tout.' },
    ],
  },
  leadMagnet: {
    title: 'Le guide "Semaine Zen"',
    text: '10 templates de menus + check-list de courses "zéro gaspillage".',
    cta: 'Recevoir le guide gratuit',
    source: 'main_lead_magnet',
  },
  finalCta: {
    headline: 'Choisissez votre première étape.',
    button: 'Commencer gratuitement',
    subtitle: 'Rejoignez +12 000 personnes qui ont arrêté de se demander quoi manger ce soir.',
  },
};

// =====================================================
// FIT
// =====================================================
export const fitCopy: PageMarketingCopy = {
  seo: {
    title: 'NutriZen Fit — Macros automatiques, menus performance, meal prep',
    description: 'Calcul TDEE + macros personnalisées. Menus optimisés protéines pour sèche, prise de masse ou maintenance. Meal prep intégré. +4 000 sportifs.',
  },
  hero: {
    badge: 'Nutrition de performance · Macros automatiques · Adapté à votre objectif',
    h1: 'Mange pour performer.\nPas pour deviner.',
    subtitle: 'NutriZen Fit calcule vos macros cibles, génère vos menus adaptés et ajuste chaque semaine selon vos résultats. Sèche, prise de masse ou maintenance — vos repas sont toujours alignés avec votre objectif.',
    bullets: [
      { icon: 'heart', bold: 'Objectif sélectionnable', text: ': prise de masse / sèche / recomposition / maintenance' },
      { icon: 'zap', bold: 'Calcul TDEE automatique', text: 'selon votre activité physique réelle' },
      { icon: 'clock', bold: 'Meal prep intégré', text: '— cuisinez une fois, mangez bien toute la semaine' },
      { icon: 'shopping', bold: 'Compatible tous sports', text: ': musculation, crossfit, running, cyclisme' },
    ],
    primaryCta: 'Calculer mes macros et voir mon menu →',
    secondaryCta: 'Voir un exemple de plan Sèche / Prise de masse',
    secondaryAction: 'example',
    socialProof: '+4 000 sportifs',
    socialProofSuffix: 'ont optimisé leur nutrition',
    heroImage: '/img/hero-thomas.png',
    heroImageAlt: 'Sportif avec un repas fit équilibré',
    floatingTop: { value: 'TDEE', label: 'Macros calculées' },
    floatingBottom: { value: '150g', label: 'Protéines/jour' },
    trustLine: '⭐ 4.8/5  ·  +4 000 sportifs  ·  Macros recalculées chaque semaine  ·  Sans engagement',
  },
  benefits: {
    title: 'Pourquoi choisir NutriZen Fit ?',
    cards: [
      { title: 'Progression mesurable', result: 'Plan cohérent', description: 'Un plan cohérent semaine après semaine, sans repartir de zéro.' },
      { title: 'Moins de décisions', result: 'Focus sur l\'essentiel', description: 'Vous suivez le plan, vous ajustez, point. Fini le flou.' },
      { title: 'Fit réaliste', result: 'Tenable au quotidien', description: 'Pas de cuisine "bodybuilder" : juste efficace, tenable, bon.' },
    ],
  },
  howItWorks: {
    title: 'Comment ça marche ?',
    subtitle: '3 étapes vers votre plan Fit personnalisé',
    steps: [
      { title: 'Objectif + rythme sportif', description: 'Sèche, maintien ou prise de masse + contraintes de votre planning.' },
      { title: 'Plan Fit prêt', description: 'Menus + recettes + macros + liste de courses.' },
      { title: 'Optimisation continue', description: 'Remplacez un repas sans casser la logique nutritionnelle.' },
    ],
  },
  faq: {
    items: [
      { question: 'Comment NutriZen calcule mes macros ?', answer: 'Via votre TDEE (dépense énergétique totale) calculé selon votre poids, taille, âge, sexe et niveau d\'activité. Vous choisissez votre objectif et les macros sont recalculées chaque semaine.' },
      { question: 'Ça marche pour la prise de masse ET la sèche ?', answer: 'Oui. Vous changez d\'objectif à tout moment depuis votre profil. Les menus et macros s\'ajustent immédiatement.' },
      { question: 'Les recettes sont adaptées au meal prep ?', answer: 'Une vue "Meal prep" regroupe toutes les recettes optimisées pour être préparées en batch. La liste de courses est adaptée en conséquence.' },
      { question: 'Ça fonctionne si je m\'entraîne le matin et mange différemment les jours de repos ?', answer: 'Oui. Vous indiquez vos jours d\'entraînement et NutriZen ajuste les apports pour chaque journée — plus de glucides les jours d\'entraînement, profil différent les jours de repos.' },
      { question: 'Je peux synchroniser avec mon tracker fitness ?', answer: 'L\'intégration avec les principales applications de fitness est en cours de développement. En attendant, vous pouvez saisir manuellement votre activité.' },
      { question: 'Combien de temps ça prend vraiment chaque semaine ?', answer: '5 à 10 minutes le dimanche pour valider votre menu et votre liste de courses. C\'est tout.' },
    ],
  },
  leadMagnet: {
    title: 'Pack "Meal Prep Fit"',
    text: '7 bases protéinées + listes de courses prêtes à copier.',
    cta: 'Recevoir le pack Fit',
    source: 'fit_lead_magnet',
  },
  finalCta: {
    headline: 'Votre alimentation devrait être aussi sérieuse que votre entraînement.',
    button: 'Calculer mes macros gratuitement',
    subtitle: 'Rejoignez +4 000 sportifs qui ont arrêté de deviner ce qu\'ils doivent manger.',
  },
};

// =====================================================
// MUM (Family + Kids — LOCKED)
// =====================================================
export const mumCopy: PageMarketingCopy = {
  seo: {
    title: 'NutriZen Mum — Menus famille, rapides et kids-friendly',
    description: 'Des menus pensés pour les semaines chargées : repas qui plaisent aux enfants, batch cooking, goûters, budget, liste de courses simplifiée.',
  },
  hero: {
    badge: 'Profil Mum • Famille • Rapide • Budget',
    h1: 'Des repas de famille qui tiennent dans une vraie semaine.',
    subtitle: 'NutriZen t\'aide à planifier des repas simples qui plaisent aux enfants, avec des alternatives quand ils sont difficiles, une liste de courses claire, et du batch cooking quand tu veux gagner du temps.',
    bullets: [
      { icon: 'heart', bold: 'Repas kids-friendly', text: '+ options "enfants difficiles"' },
      { icon: 'clock', bold: 'Batch cooking', text: ': prépare en 1 fois, mange plusieurs jours' },
      { icon: 'zap', bold: 'Goûters/collations', text: '+ petits-déjeuners rapides' },
      { icon: 'shopping', bold: 'Liste de courses courte', text: ', anti-doublons, budget maîtrisé' },
    ],
    primaryCta: 'Créer mon menu Famille',
    secondaryCta: 'Voir un exemple de semaine',
    secondaryAction: 'example',
    heroImage: '/img/hero-sarah.png',
    heroImageAlt: 'Famille heureuse qui prépare un repas ensemble',
    floatingTop: { value: '30s', label: 'Menu famille prêt' },
    floatingBottom: { value: '5h', label: 'Économisées/semaine' },
    trustLine: 'Compte gratuit — Sans carte bancaire, en 30 secondes',
  },
  benefits: {
    title: 'Pourquoi choisir NutriZen Mum ?',
    cards: [
      { title: 'Repas qui plaisent aux enfants', result: 'Fini les "j\'aime pas"', description: 'Des idées simples, adaptables, avec des variantes si tes enfants sont difficiles.' },
      { title: 'Semaines chargées, plan simplifié', result: 'Moins de stress', description: 'Moins de décisions, plus d\'exécution : tu sais quoi faire chaque jour.' },
      { title: 'Zéro culpabilité', result: 'Ajuste à la volée', description: 'Tu ajustes à la volée : substitutions, alternatives, repas "backup" prêts.' },
    ],
  },
  howItWorks: {
    title: 'Comment ça marche ?',
    subtitle: '3 étapes vers ton plan famille simplifié',
    steps: [
      { title: 'Ton contexte famille', description: 'Budget, temps, préférences, aliments à éviter : on simplifie.' },
      { title: 'Ton plan famille', description: 'Menus + idées backup + liste de courses claire.' },
      { title: 'Adaptation express', description: 'Remplace un repas, ajoute une alternative, régénère une journée en 1 clic.' },
    ],
  },
  faq: {
    items: [
      // Mum-specific
      { question: 'Mes enfants sont difficiles, ça marche ?', answer: 'Oui. NutriZen propose des variantes et des alternatives simples (textures, ingrédients, assaisonnements).' },
      { question: 'Je n\'ai pas le temps en semaine.', answer: 'Active le mode rapide et/ou batch cooking pour préparer en une fois.' },
      { question: 'Je veux maîtriser le budget.', answer: 'La liste de courses est structurée et évite les doublons. Tu peux privilégier des ingrédients réutilisables.' },
      { question: 'Je dois changer un repas au dernier moment.', answer: 'Tu peux remplacer une journée, demander une substitution, ou choisir un repas "backup" en 1 clic.' },
      { question: 'Puis-je utiliser NutriZen pour toute ma famille ?', answer: 'Oui, NutriZen peut générer des menus adaptés pour toute la famille. Tu peux ajuster les portions et les préférences alimentaires pour inclure les enfants.' },
      // Abonnement & crédits
      { question: 'Puis-je annuler à tout moment ?', answer: 'Oui, tu peux annuler ton abonnement à tout moment. L\'accès reste actif jusqu\'à la fin de la période payée.' },
      { question: 'Comment fonctionne le rollover ?', answer: 'Les crédits non utilisés sont reportés au mois suivant, dans la limite du cap de rollover (20 pour Starter, 80 pour Premium). Les crédits au-delà du cap sont perdus.' },
      { question: 'Les crédits offerts (bienvenue) sont-ils reconductibles ?', answer: 'Non, les 14 crédits de bienvenue sont offerts une seule fois. Ils n\'expirent pas et restent sur ton compte jusqu\'à utilisation.' },
      { question: 'Puis-je acheter des crédits en plus de mon abonnement ?', answer: 'Oui ! Les packs de crédits (top-ups) sont disponibles à tout moment. Les abonnés Premium bénéficient de -10% sur tous les packs.' },
      // Général
      { question: 'Est-ce que mes données sont sécurisées (RGPD) ?', answer: 'Totalement. Nous sommes conformes RGPD. Tes données personnelles ne sont ni vendues ni partagées. Elles servent uniquement à personnaliser tes menus.' },
      { question: 'Comment contacter le support ?', answer: 'Tu peux nous contacter via le formulaire de contact sur le site, par email à support@nutrizen.fr, ou directement depuis ton espace membre. Nous répondons sous 24h en moyenne.' },
    ],
  },
  leadMagnet: {
    title: 'Pack "Repas Famille"',
    text: '7 dîners kids-friendly + 5 idées de goûters + liste de courses prête à copier.',
    cta: 'Recevoir le pack Famille',
    source: 'mum_lead_magnet',
  },
  finalCta: {
    headline: 'Prêt à simplifier les repas de famille dès cette semaine ?',
    button: 'Commencer Famille',
    subtitle: 'Créer ton compte en 30 secondes — sans carte bancaire',
  },
};

// =====================================================
// PRO
// =====================================================
export interface ProCopy {
  seo: { title: string; description: string };
  hero: {
    badge: string;
    h1: string;
    subtitle: string;
  };
  waitlist: {
    title: string;
    text: string;
    placeholder: string;
    button: string;
  };
  miniCards: { label: string }[];
  features: { title: string; text: string }[];
  finalCtaButton: string;
}

export const proCopy: ProCopy = {
  seo: {
    title: 'NutriZen Pro — Assistant nutrition pour professionnels',
    description: 'Centralise tes clients, standardise tes plans, gagne du temps sur le suivi. Accès en avant-première via liste d\'attente.',
  },
  hero: {
    badge: 'Bientôt disponible • Accès early',
    h1: 'NutriZen Pro : la nutrition en mode "cabinet".',
    subtitle: 'Un assistant conçu pour accélérer la création de plans, structurer le suivi, et standardiser la qualité sans perdre l\'humain.',
  },
  waitlist: {
    title: 'Accès early + avantage fondateur',
    text: 'Inscris-toi pour être notifié du lancement et obtenir les conditions "founder" réservées aux premiers utilisateurs.',
    placeholder: 'votre@email.com',
    button: 'Me notifier',
  },
  miniCards: [
    { label: 'Gestion clients' },
    { label: 'Suivi & analytics' },
    { label: 'Templates' },
    { label: 'Gain de temps' },
  ],
  features: [
    { title: 'Portefeuille clients unifié', text: 'Profils, préférences, historiques et notes au même endroit.' },
    { title: 'Suivi lisible', text: 'Indicateurs clés et évolution dans le temps.' },
    { title: 'Plans structurés', text: 'Génération, personnalisation et export en quelques clics.' },
    { title: 'Rappels & organisation', text: 'Intégration calendrier et routines de suivi.' },
    { title: 'Base nutritionnelle', text: 'Recettes, aliments, substitutions et variations.' },
  ],
  finalCtaButton: 'Me notifier',
};

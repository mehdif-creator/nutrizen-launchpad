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
    title: 'NutriZen Fit — Menus fitness + repères macros + meal prep',
    description: 'Plans repas adaptés à ton objectif (sèche/maintien/prise de masse). Recettes riches en protéines, repères nutritionnels lisibles, substitutions fit.',
  },
  hero: {
    badge: 'Profil Fit • Sèche / Maintien / Prise de masse',
    h1: 'Mange pour performer. Pas pour deviner.',
    subtitle: 'Un plan repas qui colle à ton objectif, avec des recettes "fit", des repères nutritionnels clairs, et des ajustements rapides quand ta semaine bouge.',
    bullets: [
      { icon: 'heart', bold: 'Recettes orientées protéines', text: '+ options "low-cal"' },
      { icon: 'zap', bold: 'Repères nutritionnels lisibles', text: 'par repas' },
      { icon: 'clock', bold: 'Mode "meal prep"', text: ': 2h d\'avance = semaine simplifiée' },
      { icon: 'shopping', bold: 'Ajustements express', text: ': protéines ↑, calories ↓, portions ↕' },
    ],
    primaryCta: 'Créer mon plan Fit',
    secondaryCta: 'Voir un exemple macros',
    secondaryAction: 'example',
    heroImage: '/img/hero-thomas.png',
    heroImageAlt: 'Sportif avec un repas fit équilibré',
    floatingTop: { value: '30s', label: 'Plan Fit personnalisé' },
    floatingBottom: { value: '150g', label: 'Protéines/jour' },
    trustLine: 'Compte gratuit — Sans carte bancaire, en 30 secondes',
  },
  benefits: {
    title: 'Pourquoi choisir NutriZen Fit ?',
    cards: [
      { title: 'Progression mesurable', result: 'Plan cohérent', description: 'Un plan cohérent semaine après semaine, sans repartir de zéro.' },
      { title: 'Moins de décisions', result: 'Focus sur l\'essentiel', description: 'Tu suis le plan, tu ajustes, point. Fini le flou.' },
      { title: 'Fit réaliste', result: 'Tenable au quotidien', description: 'Pas de cuisine "bodybuilder" : juste efficace, tenable, bon.' },
    ],
  },
  howItWorks: {
    title: 'Comment ça marche ?',
    subtitle: '3 étapes vers ton plan Fit personnalisé',
    steps: [
      { title: 'Objectif + rythme sportif', description: 'Sèche, maintien ou prise de masse + contraintes de ton planning.' },
      { title: 'Plan Fit prêt', description: 'Menus + recettes + repères + liste de courses.' },
      { title: 'Optimisation continue', description: 'Remplace un repas sans casser la logique nutritionnelle.' },
    ],
  },
  faq: {
    items: [
      // Fit-specific
      { question: 'C\'est adapté à la prise de masse ?', answer: 'Oui. Choisis ton objectif et NutriZen ajuste les portions et la densité énergétique.' },
      { question: 'Je veux sécher sans me prendre la tête.', answer: 'Active l\'option "low-cal" : recettes plus légères et repères plus stricts.' },
      { question: 'Je déteste compter.', answer: 'Utilise les repères par repas : tu suis le plan, tu ajustes seulement si besoin.' },
      { question: 'Je fais du meal prep.', answer: 'Oui. Le mode "meal prep" te propose des recettes compatibles batch cooking.' },
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
    title: 'Pack "Meal Prep Fit"',
    text: '7 bases protéinées + listes de courses prêtes à copier.',
    cta: 'Recevoir le pack Fit',
    source: 'fit_lead_magnet',
  },
  finalCta: {
    headline: 'Prêt à transformer ta nutrition en routine ?',
    button: 'Démarrer mon plan Fit',
    subtitle: 'Créer ton compte en 30 secondes — sans carte bancaire',
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

export type PersonaKey = 'thomas' | 'sarah' | 'kevin' | 'default';

export interface PersonaConfig {
  h1: string;
  sub: string;
  heroImage: string;
  pain: string[];
  benefits: string[];
  exampleWeekHints: string[];
  testimonials: Array<{ quote: string; name: string; avatar?: string }>;
  pricingNote?: string;
}

export const personaConfig: Record<PersonaKey, PersonaConfig> = {
  thomas: {
    h1: "Arrête de gâcher ta séance avec Uber Eats : menus muscu en 30 s.",
    sub: "Recettes rapides + liste de courses auto. Zéro calcul.",
    heroImage: "/img/hero-thomas.png",
    pain: [
      "Macros compliquées à calculer",
      "Frigo vide après la salle",
      "Uber Eats trop souvent"
    ],
    benefits: [
      "Gain de temps quotidien",
      "Progrès visibles rapidement",
      "Budget alimentaire maîtrisé"
    ],
    exampleWeekHints: [
      "Jours ON/OFF muscu adaptés",
      "Batch-cooking express 90 min"
    ],
    testimonials: [
      {
        quote: "+5 kg de muscle en 3 mois, beaucoup moins d'Uber Eats. Game changer.",
        name: "Thomas D., 28 ans"
      }
    ],
    pricingNote: "Recommandé : Équilibre pour suivre ta prise de masse"
  },
  sarah: {
    h1: "Finis le meal-prep de 3 h : menus CrossFit adaptés à tes WOD.",
    sub: "Variété sans prise de tête, recettes 20–30 min max.",
    heroImage: "/img/hero-sarah.png",
    pain: [
      "Meal-prep qui prend tout le dimanche",
      "Manque de variété dans l'assiette",
      "Macros floues selon les WOD"
    ],
    benefits: [
      "Batch-cook léger et efficace",
      "Nutrition adaptée ON/OFF",
      "Zéro calcul mental"
    ],
    exampleWeekHints: [
      "Jours WOD on/off adaptés",
      "Recettes express post-entraînement"
    ],
    testimonials: [
      {
        quote: "3 PR battus ce mois-ci, et plus de dimanche perdu en cuisine.",
        name: "Sarah L., 32 ans"
      }
    ],
    pricingNote: "Recommandé : Premium pour swaps illimités"
  },
  kevin: {
    h1: "Dis adieu au mur du km 30 — nutrition d'endurance, claire et prête.",
    sub: "Avant/pendant/après sortie : tu sais quoi manger et quand.",
    heroImage: "/img/hero-kevin.png",
    pain: [
      "Mur au km 30 en sortie longue",
      "Je ne sais pas quoi manger la veille",
      "Confusion sur les gels et l'hydratation"
    ],
    benefits: [
      "Carb-loading simple et clair",
      "Routines avant/après faciles",
      "Listes de courses prêtes"
    ],
    exampleWeekHints: [
      "Veille de sortie longue optimisée",
      "Recovery simple et rapide"
    ],
    testimonials: [
      {
        quote: "Marathon en 3h28, aucun mur. Juste suivi le plan, c'était nickel.",
        name: "Kevin R., 35 ans"
      }
    ],
    pricingNote: "Recommandé : Équilibre pour tes sorties longues"
  },
  default: {
    h1: "Des menus adaptés à tes objectifs, prêts en 30 secondes.",
    sub: "Recettes rapides, liste de courses automatique, zéro charge mentale.",
    heroImage: "/img/hero-default.png",
    pain: [
      "Manque de temps pour planifier",
      "Idées de repas limitées",
      "Courses compliquées et longues"
    ],
    benefits: [
      "Gain de temps immédiat",
      "Variété et équilibre",
      "Budget alimentaire optimisé"
    ],
    exampleWeekHints: [
      "Semaine équilibrée type",
      "Recettes 20–30 min maximum"
    ],
    testimonials: [
      {
        quote: "Enfin une semaine claire dans mon assiette. Plus de stress pour les repas.",
        name: "Julie M., 29 ans"
      }
    ]
  }
};

export const getPersonaFromUrl = (): PersonaKey => {
  if (typeof window === 'undefined') return 'default';
  const params = new URLSearchParams(window.location.search);
  const persona = params.get('persona') as PersonaKey | null;
  return persona && persona in personaConfig ? persona : 'default';
};

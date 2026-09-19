/**
 * Contextual CTA copy rules — shared by the React article page and the
 * build-time prerenderer (pure TS, no React import).
 */
export interface CtaCopy {
  headline: string;
  body: string;
  action: string;
  to: string;
}

export const DEFAULT_CTA: CtaCopy = {
  headline: 'Passez de la théorie à votre semaine réelle',
  body: 'NutriZen construit vos menus de la semaine selon vos goûts, votre temps et votre budget, puis génère la liste de courses correspondante.',
  action: 'Créer mon menu de la semaine',
  to: '/pricing',
};

const RULES: { match: RegExp; copy: CtaCopy }[] = [
  {
    match: /(ce soir|dîner|diner|idée de repas|idees de repas|que manger|que faire avec)/i,
    copy: {
      headline: 'Plus besoin de chercher une idée chaque soir',
      body: 'NutriZen génère directement votre menu de la semaine selon vos goûts, votre temps disponible et votre budget, avec la liste de courses associée.',
      action: 'Générer mon menu de la semaine',
      to: '/pricing',
    },
  },
  {
    match: /(budget|étudiant|etudiant|pas cher|économique|economique)/i,
    copy: {
      headline: 'Manger équilibré sans faire exploser le budget',
      body: 'NutriZen calcule vos menus et vos courses en tenant compte du budget que vous fixez, sans ingrédients inutiles qui finissent à la poubelle.',
      action: 'Voir mes menus adaptés à mon budget',
      to: '/pricing',
    },
  },
  {
    match: /(protéine|proteine|muscu|masse|sport|fitness|perte de poids|maigrir|calorie)/i,
    copy: {
      headline: 'Vos objectifs traduits en repas concrets',
      body: 'NutriZen répartit vos calories et vos protéines sur la semaine, puis propose des recettes qui correspondent réellement à votre objectif.',
      action: 'Calculer mes menus selon mon objectif',
      to: '/pricing',
    },
  },
  {
    match: /(batch|meal prep|semaine|préparer|preparer|anti-gaspi|anti gaspillage|conserver)/i,
    copy: {
      headline: 'Un plan de semaine prêt en quelques secondes',
      body: 'NutriZen organise vos repas, regroupe les cuissons et vous donne la liste de courses exacte : vous cuisinez une fois, vous mangez toute la semaine.',
      action: 'Organiser ma semaine avec NutriZen',
      to: '/pricing',
    },
  },
  {
    match: /(enfant|famille|bébé|bebe|maman)/i,
    copy: {
      headline: 'Des repas qui passent aussi avec les enfants',
      body: 'NutriZen adapte les portions à chaque membre du foyer et propose des recettes acceptées par les enfants, sans cuisiner deux fois.',
      action: 'Voir des menus famille',
      to: '/pricing',
    },
  },
];

export function resolveContextualCtaCopy(topic?: string | null): CtaCopy {
  const t = topic || '';
  return RULES.find((r) => r.match.test(t))?.copy ?? DEFAULT_CTA;
}


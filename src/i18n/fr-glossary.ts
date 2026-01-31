/**
 * GLOSSAIRE FRANÇAIS - NutriZen
 * 
 * Ce fichier définit les termes spécifiques au domaine pour éviter les erreurs
 * de traduction et les homonymes courants en français.
 * 
 * RÈGLES DE TRADUCTION:
 * - Toujours utiliser le contexte approprié
 * - Ne jamais laisser une IA traduire automatiquement
 * - Vérifier ce glossaire avant d'ajouter de nouveaux termes
 */

export const GLOSSARY_FR = {
  // CUISINE & APPAREILS
  // "four" = oven (appareil), PAS le nombre 4!
  oven: "four", // appareil de cuisson
  range: "cuisinière", // plaque de cuisson (pas "plage" ou "intervalle")
  stove: "plaque de cuisson",
  microwave: "micro-ondes",
  blender: "mixeur / blender",
  
  // TEMPS & QUANTITÉS  
  // Attention: "range" dans le contexte de temps = plage/intervalle
  timeRange: "plage horaire",
  numericRange: "intervalle",
  
  // NUTRITION
  servings: "portions", // pas "services"
  serving: "portion",
  calories: "calories",
  protein: "protéines",
  carbs: "glucides",
  fat: "lipides",
  fiber: "fibres",
  macros: "macronutriments / macros",
  
  // ABONNEMENT & FACTURATION
  // "plan" = abonnement (billing) OU programme (nutrition)
  subscriptionPlan: "formule d'abonnement", // contexte facturation
  mealPlan: "programme alimentaire / plan repas", // contexte nutrition
  weeklyPlan: "plan hebdomadaire",
  
  // ACTIONS
  swap: "remplacer / échanger",
  substitute: "substituer",
  generate: "générer",
  regenerate: "régénérer",
  
  // ERREURS COURANTES À ÉVITER
  // ❌ four → quatre (JAMAIS dans le contexte cuisine)
  // ❌ range → gamme (sauf pour "gamme de produits")
  // ❌ servings → services (erreur fréquente)
  // ❌ plan → plan (ambigu - toujours préciser le contexte)
  
  // CONTEXTES SPÉCIFIQUES
  kitchen: {
    appliances: "électroménager / appareils",
    cookingMethod: "mode de cuisson",
    prepTime: "temps de préparation",
    cookTime: "temps de cuisson",
    totalTime: "temps total",
  },
  
  goals: {
    weightLoss: "perte de poids",
    weightGain: "prise de poids",
    maintenance: "maintien",
    muscleGain: "prise de masse musculaire",
  },
  
  ui: {
    loading: "chargement en cours",
    retry: "réessayer",
    cancel: "annuler",
    save: "enregistrer",
    edit: "modifier",
    delete: "supprimer",
  },
} as const;

/**
 * Known translation errors that should NEVER occur
 * These are used to QA-check translated content
 */
export const FORBIDDEN_TRANSLATIONS = {
  // "four" (oven) should never become "quatre" (four)
  fourQuatre: {
    pattern: /\bquatre\b(?=\s+(?:chauffé|préchauffé|degré|°C|°F|minutes|min))/gi,
    error: 'Erreur : "quatre" utilisé au lieu de "four" (appareil)',
    fix: 'four',
  },
  // "range" should not be "gamme" in cooking context
  rangeGamme: {
    pattern: /\bgamme\s+(?:de\s+)?(?:cuisson|température)/gi,
    error: 'Erreur : "gamme" utilisé au lieu de "plage" pour température',
    fix: 'plage de',
  },
  // Common misspellings
  misspellings: {
    pattern: /\b(?:récétte|ingrédiant|protéïne)\b/gi,
    error: 'Faute d\'orthographe détectée',
    fix: null, // Needs manual review
  },
} as const;

/**
 * Helper pour récupérer un terme du glossaire de manière type-safe
 */
export function getGlossaryTerm(path: string): string {
  const parts = path.split('.');
  let current: any = GLOSSARY_FR;
  
  for (const part of parts) {
    current = current?.[part];
    if (!current) return path;
  }
  
  return typeof current === 'string' ? current : path;
}

/**
 * Validate text for translation errors
 * Returns array of issues found
 */
export function validateTranslation(text: string): { error: string; match: string }[] {
  const issues: { error: string; match: string }[] = [];
  
  for (const [key, rule] of Object.entries(FORBIDDEN_TRANSLATIONS)) {
    const matches = text.match(rule.pattern);
    if (matches) {
      matches.forEach(match => {
        issues.push({
          error: rule.error,
          match,
        });
      });
    }
  }
  
  return issues;
}

/**
 * Allergen synonyms for validation
 * Maps allergen to all possible ingredient names that contain it
 */
export const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  arachide: ['arachide', 'arachides', 'cacahuète', 'cacahuètes', 'cacahuete', 'peanut', 'peanuts', 'beurre de cacahuète'],
  gluten: ['gluten', 'blé', 'farine de blé', 'seigle', 'orge', 'avoine', 'épeautre', 'kamut', 'wheat', 'flour'],
  lactose: ['lactose', 'lait', 'crème', 'fromage', 'beurre', 'yaourt', 'yogourt', 'dairy', 'milk', 'cheese', 'cream'],
  nuts: ['noix', 'amande', 'amandes', 'noisette', 'noisettes', 'noix de cajou', 'pistache', 'pécan', 'macadamia', 'walnut', 'almond', 'hazelnut'],
  eggs: ['oeuf', 'oeufs', 'œuf', 'œufs', 'egg', 'eggs', 'mayonnaise'],
  shellfish: ['crevette', 'crevettes', 'crabe', 'homard', 'langouste', 'fruits de mer', 'moule', 'moules', 'huître', 'shrimp', 'crab', 'lobster'],
  soy: ['soja', 'tofu', 'edamame', 'tempeh', 'sauce soja', 'soy'],
  sesame: ['sésame', 'sesame', 'tahini', 'tahina'],
  fish: ['poisson', 'saumon', 'thon', 'cabillaud', 'colin', 'sardine', 'anchois', 'fish', 'salmon', 'tuna'],
};

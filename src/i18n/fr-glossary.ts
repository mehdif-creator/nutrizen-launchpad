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

import { createClient } from '../_shared/deps.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, rateLimitExceededResponse } from '../_shared/rateLimit.ts';
import { getCorsHeaders, getSecurityHeaders, logEdgeFunctionError } from '../_shared/security.ts';

// ══════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ══════════════════════════════════════════════════════════════
const GenerateMenuSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

const redactId = (id: string): string => id ? id.substring(0, 8) + '***' : 'null';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════
interface AllergyEntry {
  name: string;
  type: 'allergie' | 'intolerance';
  traces_ok: boolean;
}

interface MealConfig {
  meal_type: string;
  meal_time: string | null;
  who_eats: string;
  who_eats_custom: string[] | null;
  portions: number;
  portions_manual: boolean;
  location: string;
  generate_recipe: boolean;
  batch_cooking: boolean;
}

interface UserContext {
  profile: any;
  objectives: any;
  habits: any;
  mealsConfig: MealConfig[];
  allergies: any;
  foodStyle: any;
  nutrition: any;
  household: any;
  lifestyle: any;
  legacyPreferences: any;
  legacyProfile: any;
}

interface GeneratedRecipe {
  type: string;
  nom: string;
  portions: number;
  kcal_par_portion: number;
  temps_preparation_min: number;
  ingredients: { nom: string; quantite: string; unite: string }[];
  etapes: string[];
  macros_par_portion: { proteines_g: number; glucides_g: number; lipides_g: number };
  tags: string[];
  conforme_profil: boolean;
}

// ══════════════════════════════════════════════════════════════
// PARTIE 1 — buildUserContext()
// ══════════════════════════════════════════════════════════════
async function buildUserContext(supabaseClient: any, userId: string): Promise<UserContext> {
  const [
    { data: profile },
    { data: objectives },
    { data: habits },
    { data: mealsConfig },
    { data: allergies },
    { data: foodStyle },
    { data: nutrition },
    { data: household },
    { data: lifestyle },
    { data: legacyPreferences },
    { data: legacyProfile },
  ] = await Promise.all([
    supabaseClient.from('user_profile').select('*').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('user_objectives').select('*').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('user_eating_habits').select('*').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('user_meals_config').select('*').eq('user_id', userId),
    supabaseClient.from('user_allergies').select('*').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('user_food_style').select('*').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('user_nutrition_goals').select('*').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('user_household').select('*').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('user_lifestyle').select('*').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('profiles').select('household_adults, household_children, kid_portion_ratio, meals_per_day').eq('id', userId).maybeSingle(),
  ]);

  return {
    profile: profile ?? {},
    objectives: objectives ?? {},
    habits: habits ?? {},
    mealsConfig: (mealsConfig ?? []) as MealConfig[],
    allergies: allergies ?? {},
    foodStyle: foodStyle ?? {},
    nutrition: nutrition ?? {},
    household: household ?? {},
    lifestyle: lifestyle ?? {},
    legacyPreferences: legacyPreferences ?? {},
    legacyProfile: legacyProfile ?? {},
  };
}

// ══════════════════════════════════════════════════════════════
// PARTIE 2 — validateRecipe() — HARD CONSTRAINTS
// ══════════════════════════════════════════════════════════════

// Diet exclusion map (normalized keys — no accents, lowercase)
const DIET_EXCLUSIONS: Record<string, string[]> = {
  'vegan': ['viande', 'poulet', 'bœuf', 'porc', 'agneau', 'canard', 'dinde', 'poisson', 'saumon', 'thon', 'crevette', 'crabe', 'homard', 'fruits de mer', 'œuf', 'oeuf', 'lait', 'crème', 'beurre', 'fromage', 'yaourt', 'miel', 'gélatine'],
  'vegetarien': ['viande', 'poulet', 'bœuf', 'porc', 'agneau', 'canard', 'dinde', 'poisson', 'saumon', 'thon', 'crevette', 'crabe', 'homard', 'fruits de mer', 'gélatine'],
  'pescetarien': ['viande', 'poulet', 'bœuf', 'porc', 'agneau', 'canard', 'dinde'],
  'halal': ['porc', 'jambon', 'bacon', 'lard', 'saucisson', 'chorizo', 'vin', 'bière', 'alcool', 'rhum', 'cognac', 'calvados'],
  'casher': ['porc', 'jambon', 'bacon', 'lard', 'saucisson', 'chorizo', 'crevette', 'crabe', 'homard', 'fruits de mer'],
};

// Normalize diet type from form labels to diet exclusion keys
function normalizeDietType(raw: string): string {
  const normalized = (raw || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip accents
  const map: Record<string, string> = {
    'vegetalien': 'vegan',
    'vegan': 'vegan',
    'vegetarien': 'vegetarien',
    'pescetarien': 'pescetarien',
    'halal': 'halal',
    'casher': 'casher',
    'omnivore': 'omnivore',
    'flexitarien': 'omnivore',
    'keto': 'omnivore',
    'low carb': 'omnivore',
    'paleo': 'omnivore',
    'mediterraneen': 'omnivore',
  };
  return map[normalized] || normalized;
}

// Medical condition restrictions
const MEDICAL_EXCLUSIONS: Record<string, string[]> = {
  'diabete_2': ['sucre blanc', 'sucre ajouté', 'sirop', 'confiture', 'soda', 'jus de fruits sucré', 'farine blanche', 'pain blanc', 'pâtisserie'],
  'hypertension': ['charcuterie', 'saucisson', 'jambon cru', 'fromage très salé', 'conserves salées', 'sauce soja', 'bouillon cube'],
  'cholesterol': ['friture', 'viande grasse', 'crème entière', 'saindoux', 'charcuterie', 'beurre en grande quantité'],
  'hypothyroidie': ['soja en excès'],
};

function validateRecipe(recipe: GeneratedRecipe, ctx: UserContext): { valid: boolean; reason: string } {
  const ingredientNames = recipe.ingredients.map(i => i.nom.toLowerCase());
  const allText = ingredientNames.join(' ') + ' ' + recipe.nom.toLowerCase();

  // 2.1 Allergies
  const allergyList: AllergyEntry[] = Array.isArray(ctx.allergies?.allergies) ? ctx.allergies.allergies : [];
  for (const allergy of allergyList) {
    const allergenLower = (allergy.name || '').toLowerCase();
    if (!allergenLower) continue;

    if (allergy.type === 'allergie') {
      // Strict: no ingredient should contain the allergen name
      if (ingredientNames.some(ing => ing.includes(allergenLower))) {
        return { valid: false, reason: `Contient l'allergène "${allergy.name}"` };
      }
    } else if (allergy.type === 'intolerance') {
      // Intolerance: reject if present in significant quantity (main ingredient)
      if (ingredientNames.some(ing => ing.includes(allergenLower))) {
        return { valid: false, reason: `Contient l'intolérant "${allergy.name}" en quantité significative` };
      }
    }
  }

  // 2.2 Diet type
  const rawDietType = (ctx.foodStyle?.diet_type || ctx.legacyPreferences?.type_alimentation || '');
  const dietType = normalizeDietType(rawDietType);
  const dietExclusions = DIET_EXCLUSIONS[dietType] || [];
  for (const excl of dietExclusions) {
    if (allText.includes(excl)) {
      return { valid: false, reason: `Régime "${dietType}" interdit: contient "${excl}"` };
    }
  }

  // Casher: no meat + dairy in same recipe
  if (dietType === 'casher') {
    const hasMeat = ['viande', 'poulet', 'bœuf', 'agneau', 'dinde', 'canard'].some(m => allText.includes(m));
    const hasDairy = ['lait', 'crème', 'fromage', 'beurre', 'yaourt'].some(d => allText.includes(d));
    if (hasMeat && hasDairy) {
      return { valid: false, reason: 'Casher: mélange viande/lait interdit' };
    }
  }

  // 2.3 Foods to avoid
  const foodsToAvoid = ctx.foodStyle?.foods_to_avoid || ctx.legacyPreferences?.aliments_eviter || [];
  for (const avoid of foodsToAvoid) {
    const avoidLower = (avoid || '').toLowerCase().trim();
    if (avoidLower && allText.includes(avoidLower)) {
      return { valid: false, reason: `Contient un aliment à éviter: "${avoid}"` };
    }
  }

  // 2.4 Medical conditions
  const conditions = ctx.profile?.medical_conditions || [];
  for (const condition of conditions) {
    const exclusions = MEDICAL_EXCLUSIONS[condition] || [];
    for (const excl of exclusions) {
      if (allText.includes(excl)) {
        return { valid: false, reason: `Condition médicale "${condition}" interdit: "${excl}"` };
      }
    }
  }

  return { valid: true, reason: '' };
}

// ══════════════════════════════════════════════════════════════
// PARTIE 4 — buildMenuPrompt()
// ══════════════════════════════════════════════════════════════

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'printemps';
  if (month >= 6 && month <= 8) return 'été';
  if (month >= 9 && month <= 11) return 'automne';
  return 'hiver';
}

function buildMenuPrompt(ctx: UserContext, mealSlots: { type: string; portions: number; who_eats: string; batch_cooking: boolean }[], recentRecipeNames: string[]): { system: string; user: string } {
  // Resolve values with fallback to legacy
  const dietType = normalizeDietType(ctx.foodStyle?.diet_type || ctx.legacyPreferences?.type_alimentation || 'omnivore');
  const allergyList: AllergyEntry[] = Array.isArray(ctx.allergies?.allergies) ? ctx.allergies.allergies : [];
  const allergyDesc = allergyList.length > 0
    ? allergyList.map(a => `${a.name} (${a.type}${a.traces_ok ? ', traces OK' : ', traces interdites'})`).join(', ')
    : (ctx.legacyPreferences?.allergies || []).join(', ') || 'Aucune';
  const otherAllergies = ctx.allergies?.other_allergies || ctx.legacyPreferences?.autres_allergies || '';
  const foodsToAvoid = (ctx.foodStyle?.foods_to_avoid || ctx.legacyPreferences?.aliments_eviter || []).join(', ') || 'Aucun';
  const medicalConditions = (ctx.profile?.medical_conditions || []).join(', ') || 'Aucune';
  const availableTools = (ctx.habits?.available_tools || [
    ...(ctx.legacyPreferences?.appliances_owned || []),
    ...(ctx.legacyPreferences?.ustensiles || []),
  ]).join(', ') || 'Non spécifié';

  const mainGoal = ctx.objectives?.main_goal || ctx.legacyPreferences?.objectif_principal || 'equilibre';
  const caloricGoal = ctx.nutrition?.caloric_goal || 'equilibre';
  const targetKcal = ctx.nutrition?.target_kcal || null;
  const proteinGPerDay = ctx.nutrition?.protein_g_per_day || null;
  const macrosCustom = ctx.nutrition?.macros_custom || false;
  const macroProteinPct = ctx.nutrition?.macro_protein_pct ?? 30;
  const macroCarbsPct = ctx.nutrition?.macro_carbs_pct ?? 45;
  const macroFatPct = ctx.nutrition?.macro_fat_pct ?? 25;

  const prepTimes = ctx.habits?.prep_time || [];
  const maxPrepTime = prepTimes.includes('45min_plus') ? 60
    : prepTimes.includes('30_45min') ? 45
    : prepTimes.includes('15_30min') ? 30
    : prepTimes.includes('15min') ? 15 : 45;

  const cookingLevel = ctx.habits?.cooking_level || ctx.legacyPreferences?.niveau_cuisine || 'intermediaire';
  const favCuisines = (ctx.foodStyle?.favorite_cuisines || ctx.legacyPreferences?.cuisine_preferee || []).join(', ') || 'Variées';
  const favIngredients = (ctx.foodStyle?.favorite_ingredients || ctx.legacyPreferences?.ingredients_favoris || []).join(', ') || 'Aucun';
  const spiceLevel = ctx.foodStyle?.spice_level || ctx.legacyPreferences?.niveau_epices || 'moyen';
  const cookingMethod = ctx.foodStyle?.cooking_method || '';
  const preferOrganic = ctx.foodStyle?.prefer_organic ?? false;
  const preferSeasonal = ctx.foodStyle?.prefer_seasonal ?? false;
  const reduceSugar = ctx.foodStyle?.reduce_sugar ?? ctx.legacyPreferences?.limiter_sucre ?? false;
  const batchCooking = ctx.habits?.batch_cooking || ctx.legacyPreferences?.batch_cooking || 'non';

  // Medical condition details for prompt
  const medicalDetails: string[] = [];
  for (const cond of (ctx.profile?.medical_conditions || [])) {
    switch (cond) {
      case 'diabete_2':
        medicalDetails.push('Diabète type 2 : exclure sucres ajoutés, farines blanches, index glycémique élevé. Privilégier fibres, protéines, glucides complexes.');
        break;
      case 'hypertension':
        medicalDetails.push('Hypertension : limiter le sodium, exclure charcuteries très salées, conserves salées.');
        break;
      case 'cholesterol':
        medicalDetails.push('Cholestérol élevé : limiter graisses saturées, exclure fritures, viandes grasses, crème entière en excès.');
        break;
      case 'hypothyroidie':
        medicalDetails.push('Hypothyroïdie : modérer les crucifères crus en grandes quantités (OK cuites), éviter excès de soja.');
        break;
    }
  }

  // Goal details
  let goalDetails = '';
  switch (mainGoal) {
    case 'perte_poids':
      goalDetails = 'Perte de poids : recettes hypocaloriques, riches en fibres et protéines, faibles en graisses saturées et sucres simples. Favoriser la satiété.';
      break;
    case 'prise_muscle':
      goalDetails = 'Prise de muscle : recettes riches en protéines (min. 25-30g/portion). Apport glucidique suffisant. Pas de restriction calorique.';
      break;
    case 'energie':
      goalDetails = 'Énergie : favoriser glucides complexes, vitamines B, fer, magnésium. Éviter pics glycémiques.';
      break;
    case 'grossesse':
      goalDetails = 'Grossesse : éviter charcuteries, fromages à pâte molle, sushis, alcool, foie en excès, poissons riches en mercure. Favoriser folates, fer, calcium, oméga-3.';
      break;
    default:
      goalDetails = 'Équilibre : recettes variées et équilibrées.';
  }

  // Calorie distribution
  let calorieInstructions = '';
  if (targetKcal) {
    if (mealSlots.length === 2) {
      calorieInstructions = `Objectif calorique total : ${targetKcal} kcal/jour. Répartir : déjeuner ≈ ${Math.round(targetKcal * 0.45)} kcal, dîner ≈ ${Math.round(targetKcal * 0.55)} kcal.`;
    } else {
      calorieInstructions = `Objectif calorique total : ${targetKcal} kcal/jour répartis sur ${mealSlots.length} repas.`;
    }
  } else {
    const goalMap: Record<string, string> = {
      'hypocalorique': 'Déficit calorique modéré (~300-500 kcal sous le TDEE estimé)',
      'equilibre': 'Maintien calorique',
      'hypercalorique': 'Surplus calorique modéré (~300-500 kcal au-dessus du TDEE)',
    };
    calorieInstructions = goalMap[caloricGoal] || 'Maintien calorique';
  }

  // Meal slots description
  const mealSlotsDesc = mealSlots.map(s => {
    let desc = `${s.type === 'dejeuner' ? 'Déjeuner' : 'Dîner'} : ${s.portions} portions — qui mange : ${s.who_eats}`;
    if (s.batch_cooking) {
      desc += '\n  → Ce repas doit être en batch cooking : proposer une recette qui se conserve 3-4 jours au réfrigérateur et peut être préparée en grande quantité. Indiquer "batch_cooking" dans les tags.';
    }
    return desc;
  }).join('\n');

  // Recent recipes for non-repetition
  const recentRecipesStr = recentRecipeNames.length > 0
    ? `Ne pas reproposer ces recettes déjà générées récemment :\n${recentRecipeNames.map(n => `- ${n}`).join('\n')}`
    : '';

  const system = `Tu es un nutritionniste expert. Tu génères des menus personnalisés en français pour l'application NutriZen. Tu dois STRICTEMENT respecter toutes les contraintes du profil utilisateur. Ne propose jamais une recette qui viole une contrainte alimentaire, médicale ou de préférence de l'utilisateur. Réponds uniquement en JSON valide, sans texte autour, sans markdown.`;

  const user = `Génère un menu pour ${mealSlots.length} type(s) de repas sur 7 jours pour cet utilisateur.

=== CONTRAINTES ABSOLUES (ne jamais violer) ===
Régime alimentaire : ${dietType}
Allergies : ${allergyDesc}
${otherAllergies ? `Autres allergies : ${otherAllergies}` : ''}
Aliments à éviter absolument : ${foodsToAvoid}
Conditions médicales : ${medicalConditions}
${medicalDetails.length > 0 ? 'Détails médicaux :\n' + medicalDetails.join('\n') : ''}
Ustensiles disponibles : ${availableTools}

=== PRÉFÉRENCES DE PERSONNALISATION ===
${goalDetails}
${calorieInstructions}
Répartition macros : Protéines ${macroProteinPct}% / Glucides ${macroCarbsPct}% / Lipides ${macroFatPct}%
${proteinGPerDay ? `Apport protéines cible : ${proteinGPerDay}g/jour` : ''}
Temps de préparation max : ${maxPrepTime} minutes
Niveau en cuisine : ${cookingLevel}${cookingLevel === 'debutant' ? ' (max 5 étapes, techniques simples)' : cookingLevel === 'intermediaire' ? ' (max 8 étapes)' : ' (toutes techniques)'}
Cuisines préférées : ${favCuisines}
Ingrédients favoris à inclure dans au moins 60% des recettes : ${favIngredients}
Niveau de piment : ${spiceLevel}
${cookingMethod ? `Mode de cuisson préféré : ${cookingMethod}` : ''}
${preferOrganic ? 'Produits bio : oui, indiquer "bio" quand possible' : ''}
${preferSeasonal ? `Produits de saison : oui — Saison actuelle : ${getCurrentSeason()}` : ''}
${reduceSugar ? 'Limiter le sucre ajouté dans toutes les recettes, y compris les desserts.' : ''}
${batchCooking === 'oui' || batchCooking === 'parfois' ? 'Proposer au moins une recette par semaine adaptée au batch cooking (se conserve 3-4 jours). Indiquer "batch_cooking" dans les tags.' : ''}

=== PORTIONS PAR REPAS ===
${mealSlotsDesc}

${recentRecipesStr}

=== FORMAT DE RÉPONSE JSON ATTENDU ===
{
  "menu": [
    {
      "jour": 1,
      "repas": [
        {
          "type": "dejeuner" | "diner",
          "nom": "Nom de la recette",
          "portions": N,
          "kcal_par_portion": N,
          "temps_preparation_min": N,
          "ingredients": [
            { "nom": "...", "quantite": "...", "unite": "..." }
          ],
          "etapes": ["étape 1", "étape 2"],
          "macros_par_portion": {
            "proteines_g": N,
            "glucides_g": N,
            "lipides_g": N
          },
          "tags": ["batch_cooking", "sans_gluten", "rapide"],
          "conforme_profil": true
        }
      ]
    }
  ]
}

IMPORTANT : Chaque recette DOIT avoir conforme_profil = true. Ne génère AUCUNE recette qui viole les contraintes.`;

  return { system, user };
}

// ══════════════════════════════════════════════════════════════
// AI CALL HELPER
// ══════════════════════════════════════════════════════════════
async function callAI(system: string, userPrompt: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[generate-menu] AI gateway error ${response.status}:`, errText);
    if (response.status === 429) throw new Error("AI_RATE_LIMITED");
    if (response.status === 402) throw new Error("AI_PAYMENT_REQUIRED");
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  // Parse JSON from response (may be wrapped in markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(jsonStr);
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function childPortionCoeff(age: number): number {
  if (age <= 3) return 0.3;
  if (age <= 8) return 0.5;
  if (age <= 13) return 0.7;
  return 1.0;
}

function computeEffectivePortions(ctx: UserContext): number {
  if (ctx.household?.total_portions && ctx.household.total_portions > 0) {
    return ctx.household.total_portions;
  }
  const adults = ctx.household?.adults_count ?? ctx.legacyProfile?.household_adults ?? 1;
  const childrenAges = ctx.household?.children_ages ?? [];
  if (childrenAges.length > 0) {
    return adults + childrenAges.reduce((s: number, a: number) => s + childPortionCoeff(a), 0);
  }
  const children = ctx.household?.children_count ?? ctx.legacyProfile?.household_children ?? 0;
  const kidRatio = ctx.legacyProfile?.kid_portion_ratio ?? 0.6;
  return adults + children * kidRatio;
}

// ══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Define these outside try so they're available in catch
  let supabaseClient: any;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid token");

    console.log(`[generate-menu] Processing request for user: ${redactId(user.id)}`);

    // Rate limiting
    const rl = await checkRateLimit(supabaseClient, {
      identifier: `user:${user.id}`,
      endpoint: 'generate-menu',
      maxTokens: 2,
      refillRate: 1,
      cost: 1,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(corsHeaders, rl.retryAfter);
    }

    // Parse input
    const body = await req.json().catch(() => ({}));
    const validatedInput = GenerateMenuSchema.parse(body);

    // Week start calculation
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const defaultWeekStartStr = weekStart.toISOString().split('T')[0];
    const weekStartStr = validatedInput.week_start ?? defaultWeekStartStr;

    // ── SUBSCRIPTION GATE ──
    const { data: subRow } = await supabaseClient
      .from('subscriptions')
      .select('status, trial_end, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const now = new Date();
    const isActiveSub = subRow?.status === 'active';
    const isTrialing = subRow?.status === 'trialing' && subRow.trial_end != null && new Date(subRow.trial_end) > now;
    const hasValidAccess = isActiveSub || isTrialing;

    // ── BUILD USER CONTEXT ──
    const ctx = await buildUserContext(supabaseClient, user.id);
    console.log(`[generate-menu] User context loaded`);

    // Determine meals per day and which meals to generate
    const mealsPerDay = ctx.habits?.meals_per_day ?? ctx.legacyPreferences?.repas_par_jour ?? ctx.legacyProfile?.meals_per_day ?? 2;

    // Build meal slots from mealsConfig
    const effectivePortions = computeEffectivePortions(ctx);
    const defaultPortions = Math.max(1, Math.round(effectivePortions));

    const mealSlots: { type: string; portions: number; who_eats: string; batch_cooking: boolean }[] = [];

    if (mealsPerDay >= 2) {
      const lunchConfig = ctx.mealsConfig.find((m: MealConfig) => m.meal_type === 'dejeuner');
      if (!lunchConfig || lunchConfig.generate_recipe !== false) {
        mealSlots.push({
          type: 'dejeuner',
          portions: lunchConfig?.portions ?? defaultPortions,
          who_eats: lunchConfig?.who_eats ?? 'famille',
          batch_cooking: lunchConfig?.batch_cooking ?? false,
        });
      }
    }

    const dinnerConfig = ctx.mealsConfig.find((m: MealConfig) => m.meal_type === 'diner');
    if (!dinnerConfig || dinnerConfig.generate_recipe !== false) {
      mealSlots.push({
        type: 'diner',
        portions: dinnerConfig?.portions ?? defaultPortions,
        who_eats: dinnerConfig?.who_eats ?? 'famille',
        batch_cooking: dinnerConfig?.batch_cooking ?? false,
      });
    }

    if (mealSlots.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Aucun repas à générer (tous les repas sont configurés en restaurant ou à l\'école).' }),
        { status: 200, headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-menu] mealsPerDay=${mealsPerDay}, mealSlots=${mealSlots.map(s => s.type).join(',')}`);

    // ── CREDITS GATE ──
    const menuFeatureKey = mealsPerDay >= 2 ? 'generate_week_2' : 'generate_week_1';
    let menuCost = mealsPerDay >= 2 ? 11 : 6;

    const { data: costRow } = await supabaseClient
      .from('feature_costs')
      .select('cost')
      .eq('feature', menuFeatureKey)
      .maybeSingle();
    if (typeof costRow?.cost === 'number') menuCost = costRow.cost;

    if (!hasValidAccess) {
      const { data: walletRow } = await supabaseClient
        .from('user_wallets')
        .select('subscription_credits, lifetime_credits')
        .eq('user_id', user.id)
        .maybeSingle();
      const balance = (walletRow?.subscription_credits ?? 0) + (walletRow?.lifetime_credits ?? 0);
      if (balance < menuCost) {
        return new Response(
          JSON.stringify({
            success: false, error_code: 'NO_ACCESS',
            message: balance === 0
              ? 'Un abonnement actif ou des crédits sont requis pour générer un menu.'
              : `Crédits insuffisants. Vous avez ${balance} crédits, il en faut ${menuCost}.`,
            current_balance: balance, required: menuCost,
          }),
          { status: 403, headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' } }
        );
      }
    }

    // Pre-check balance
    const { data: walletPreCheck } = await supabaseClient
      .from('user_wallets')
      .select('subscription_credits, lifetime_credits')
      .eq('user_id', user.id)
      .maybeSingle();
    const preCheckBalance = (walletPreCheck?.subscription_credits ?? 0) + (walletPreCheck?.lifetime_credits ?? 0);
    if (preCheckBalance < menuCost) {
      return new Response(
        JSON.stringify({
          success: false, error_code: 'INSUFFICIENT_CREDITS',
          message: `Crédits insuffisants. Vous avez ${preCheckBalance} crédits, il en faut ${menuCost}.`,
          current_balance: preCheckBalance, required: menuCost,
        }),
        { status: 402, headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ── FETCH RECENT RECIPES FOR NON-REPETITION ──
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const { data: recentRecipes } = await supabaseClient
      .from('user_generated_recipes')
      .select('recipe_name')
      .eq('user_id', user.id)
      .gte('generated_at', fourteenDaysAgo.toISOString())
      .order('generated_at', { ascending: false })
      .limit(50);

    const recentRecipeNames = [...new Set((recentRecipes || []).map((r: any) => r.recipe_name))];
    console.log(`[generate-menu] ${recentRecipeNames.length} recent recipes for non-repetition`);

    // ── BUILD PROMPT & CALL AI ──
    const { system, user: userPrompt } = buildMenuPrompt(ctx, mealSlots, recentRecipeNames);
    console.log(`[generate-menu] Calling AI for menu generation...`);

    let aiResponse: any;
    try {
      aiResponse = await callAI(system, userPrompt);
    } catch (e: any) {
      if (e.message === 'AI_RATE_LIMITED') {
        return new Response(
          JSON.stringify({ success: false, error_code: 'AI_RATE_LIMITED', message: 'Le service IA est temporairement surchargé. Réessayez dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' } }
        );
      }
      if (e.message === 'AI_PAYMENT_REQUIRED') {
        return new Response(
          JSON.stringify({ success: false, error_code: 'AI_PAYMENT_REQUIRED', message: 'Crédits IA épuisés. Contactez le support.' }),
          { status: 402, headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' } }
        );
      }
      throw e;
    }

    if (!aiResponse?.menu || !Array.isArray(aiResponse.menu)) {
      console.error('[generate-menu] Invalid AI response structure:', JSON.stringify(aiResponse).substring(0, 500));
      throw new Error('Invalid AI response format');
    }

    console.log(`[generate-menu] AI returned ${aiResponse.menu.length} days`);

    // ── PARTIE 5 — POST-GENERATION VALIDATION ──
    const validatedMenu: any[] = [];
    const recipesToStore: { recipe_name: string; meal_type: string }[] = [];

    for (const day of aiResponse.menu) {
      const validatedDay: any = { jour: day.jour, repas: [] };

      for (const recipe of (day.repas || [])) {
        let currentRecipe = recipe;
        let retries = 0;
        let validated = false;

        while (retries <= 2) {
          const result = validateRecipe(currentRecipe, ctx);
          if (result.valid) {
            validated = true;
            break;
          }

          console.warn(`[generate-menu] Recipe "${currentRecipe.nom}" rejected: ${result.reason}. Retry ${retries + 1}/2`);

          if (retries >= 2) break;

          // Regenerate single recipe
          try {
            const retryPrompt = `La recette "${currentRecipe.nom}" a été rejetée car : ${result.reason}. Propose UNE SEULE alternative différente pour un ${currentRecipe.type === 'dejeuner' ? 'déjeuner' : 'dîner'} de ${currentRecipe.portions} portions. Même format JSON. Ne reproduis pas la même erreur.

Format attendu (JSON uniquement, sans markdown) :
{
  "type": "${currentRecipe.type}",
  "nom": "...",
  "portions": ${currentRecipe.portions},
  "kcal_par_portion": N,
  "temps_preparation_min": N,
  "ingredients": [{"nom":"...","quantite":"...","unite":"..."}],
  "etapes": ["..."],
  "macros_par_portion": {"proteines_g": N, "glucides_g": N, "lipides_g": N},
  "tags": [],
  "conforme_profil": true
}`;
            const retryResponse = await callAI(system, retryPrompt);
            currentRecipe = retryResponse.type ? retryResponse : (retryResponse.repas?.[0] ?? retryResponse);
          } catch (retryErr) {
            console.error(`[generate-menu] Retry AI call failed:`, retryErr);
          }
          retries++;
        }

        if (validated) {
          validatedDay.repas.push(currentRecipe);
          recipesToStore.push({ recipe_name: currentRecipe.nom, meal_type: currentRecipe.type });
        } else {
          // Placeholder for failed recipe
          validatedDay.repas.push({
            type: currentRecipe.type,
            nom: 'Recette en cours de personnalisation',
            portions: currentRecipe.portions,
            kcal_par_portion: 0,
            temps_preparation_min: 0,
            ingredients: [],
            etapes: [],
            macros_par_portion: { proteines_g: 0, glucides_g: 0, lipides_g: 0 },
            tags: ['placeholder'],
            conforme_profil: false,
          });
          console.error(`[generate-menu] Recipe for day ${day.jour} ${currentRecipe.type} could not be validated after retries`);
        }
      }

      validatedMenu.push(validatedDay);
    }

    console.log(`[generate-menu] Validated ${recipesToStore.length} recipes out of ${mealSlots.length * 7} slots`);

    // ── BUILD DAYS FOR STORAGE (backward compatible with existing dashboard) ──
    const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

    const days = validatedMenu.map((day, index) => {
      const entry: any = { day: weekdays[index] || `Jour ${day.jour}` };

      for (const recipe of day.repas) {
        const mealEntry = {
          recipe_id: null, // AI-generated, no DB recipe ID
          title: recipe.nom,
          image_url: null,
          prep_min: recipe.temps_preparation_min,
          total_min: recipe.temps_preparation_min,
          calories: recipe.kcal_par_portion * recipe.portions,
          proteins_g: recipe.macros_par_portion.proteines_g * recipe.portions,
          carbs_g: recipe.macros_par_portion.glucides_g * recipe.portions,
          fats_g: recipe.macros_par_portion.lipides_g * recipe.portions,
          portion_factor: 1,
          servings_used: recipe.portions,
          base_servings: recipe.portions,
          ai_generated: true,
          ingredients: recipe.ingredients,
          etapes: recipe.etapes,
          kcal_par_portion: recipe.kcal_par_portion,
          macros_par_portion: recipe.macros_par_portion,
          tags: recipe.tags,
        };

        if (recipe.type === 'dejeuner') {
          entry.lunch = mealEntry;
        } else {
          entry.dinner = mealEntry;
        }
      }

      return entry;
    });

    // ── SAVE MENU ──
    const householdAdults = ctx.household?.adults_count ?? ctx.legacyProfile?.household_adults ?? 1;
    const householdChildren = ctx.household?.children_count ?? ctx.legacyProfile?.household_children ?? 0;

    const { data: menu, error: menuError } = await supabaseClient
      .from("user_weekly_menus")
      .upsert({
        user_id: user.id,
        week_start: weekStartStr,
        payload: {
          days,
          household: {
            adults: householdAdults,
            children: householdChildren,
            children_ages: ctx.household?.children_ages ?? [],
            effective_size: effectivePortions,
          },
          medical_conditions: ctx.profile?.medical_conditions ?? [],
          ai_generated: true,
        },
        used_fallback: null,
        needs_regeneration: false,
      }, { onConflict: "user_id,week_start" })
      .select()
      .single();

    if (menuError) {
      console.error("[generate-menu] Error upserting menu:", menuError);
      throw new Error("Failed to save menu");
    }

    console.log(`[generate-menu] Menu saved: ${menu.menu_id}`);

    // ── SAVE MENU ITEMS ──
    const { error: deleteError } = await supabaseClient
      .from("user_weekly_menu_items")
      .delete()
      .eq("weekly_menu_id", menu.menu_id);
    if (deleteError) console.error("[generate-menu] Error deleting old items:", deleteError);

    const menuItems: any[] = [];
    days.forEach((day: any, index: number) => {
      const dayOfWeek = index + 1;
      if (day.lunch) {
        menuItems.push({
          weekly_menu_id: menu.menu_id,
          recipe_id: null,
          day_of_week: dayOfWeek,
          meal_slot: 'lunch',
          target_servings: day.lunch.servings_used,
          scale_factor: 1,
          portion_factor: 1,
        });
      }
      if (day.dinner) {
        menuItems.push({
          weekly_menu_id: menu.menu_id,
          recipe_id: null,
          day_of_week: dayOfWeek,
          meal_slot: 'dinner',
          target_servings: day.dinner.servings_used,
          scale_factor: 1,
          portion_factor: 1,
        });
      }
    });

    if (menuItems.length > 0) {
      const { error: itemsError } = await supabaseClient
        .from("user_weekly_menu_items")
        .insert(menuItems);
      if (itemsError) console.error("[generate-menu] Error inserting menu items:", itemsError);
    }

    // ── SAVE DAILY RECIPES ──
    const weekEndDate = new Date(weekStartStr + 'T00:00:00Z');
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);
    const weekEndStr = weekEndDate.toISOString().split('T')[0];

    await supabaseClient
      .from("user_daily_recipes")
      .delete()
      .eq("user_id", user.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr);

    const dailyRecipes = days.map((day: any, index: number) => {
      const dayDate = new Date(weekStartStr + 'T00:00:00Z');
      dayDate.setUTCDate(dayDate.getUTCDate() + index);
      return {
        user_id: user.id,
        date: dayDate.toISOString().split('T')[0],
        lunch_recipe_id: null,
        dinner_recipe_id: null,
      };
    });

    await supabaseClient
      .from("user_daily_recipes")
      .upsert(dailyRecipes, { onConflict: 'user_id,date' });

    // ── STORE GENERATED RECIPES FOR NON-REPETITION ──
    if (recipesToStore.length > 0) {
      const historyRows = recipesToStore.map(r => ({
        user_id: user.id,
        recipe_name: r.recipe_name,
        meal_type: r.meal_type,
        generated_at: new Date().toISOString(),
        week_start: weekStartStr,
        menu_id: menu.menu_id,
      }));
      const { error: histError } = await supabaseClient
        .from('user_generated_recipes')
        .insert(historyRows);
      if (histError) console.error('[generate-menu] Error storing recipe history:', histError);
      else console.log(`[generate-menu] Stored ${historyRows.length} recipes in history`);
    }

    // ── DEDUCT CREDITS ──
    console.log(`[generate-menu] Deducting ${menuCost} credits`);
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: menuFeatureKey,
      p_cost: menuCost,
    });
    if (creditsError) {
      console.error('[generate-menu] Credits deduction error:', creditsError);
    } else {
      console.log(`[generate-menu] ✅ ${menuCost} credits consumed. Balance: ${creditsCheck?.new_balance}`);
    }

    console.log(`[generate-menu] ✅ SUCCESS: AI-generated menu ${menu.menu_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        days,
        menu_id: menu.menu_id,
        week_start: weekStartStr,
        ai_generated: true,
        validated_recipes: recipesToStore.length,
        total_slots: mealSlots.length * 7,
      }),
      { headers: { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-menu] Error:", error);
    if (supabaseClient) {
      await logEdgeFunctionError('generate-menu', error).catch(() => {});
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" }, status: 400 }
    );
  }
});

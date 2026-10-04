// Pure, shared rules for generation AND swaps. No model output can bypass these rules.
export type Row = Record<string, any>;
export interface MenuContext {
  profile: Row;
  objectives: Row;
  habits: Row;
  mealsConfig: Row[];
  allergies: Row | null;
  foodStyle: Row | null;
  nutrition: Row;
  household: Row;
  lifestyle: Row;
  legacyPreferences: Row;
  legacyProfile: Row;
}
export type SlotName = 'lunch' | 'dinner';
export interface MealSlot {
  type: SlotName;
  portions: number;
  batchCooking: boolean;
}
export class MenuError extends Error {
  constructor(public code: string, message: string, public status = 422) {
    super(message);
  }
}
export const normalize = (s: unknown): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_’'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string').map(normalize) : [];
const textList = (v: unknown): string[] =>
  typeof v === 'string'
    ? v
        .split(/[,;\n]+/)
        .map(normalize)
        .filter(Boolean)
    : list(v);
const positive = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v) && v > 0;
export const childPortionCoeff = (age: number): number =>
  age <= 3 ? 0.3 : age <= 8 ? 0.5 : age <= 13 ? 0.7 : 1;

export function mealSlots(ctx: MenuContext): MealSlot[] {
  const count =
    ctx.habits.meals_per_day ??
    ctx.legacyPreferences.repas_par_jour ??
    ctx.legacyProfile.meals_per_day;
  if (![1, 2, 3, 4, 5].includes(count))
    throw new MenuError('PROFILE_INCOMPLETE', 'Précisez les repas à préparer dans votre profil.');
  const adults = ctx.household.adults_count ?? ctx.legacyProfile.household_adults ?? 1;
  const ages: number[] = ctx.household.children_ages ?? [];
  const children =
    ctx.household.children_count ?? ctx.legacyProfile.household_children ?? ages.length;
  if (
    !Number.isInteger(adults) ||
    adults < 0 ||
    !Number.isInteger(children) ||
    children < 0 ||
    ages.some((a) => !Number.isFinite(a) || a < 0 || a > 18) ||
    (ages.length > 0 && ages.length !== children)
  ) {
    throw new MenuError('INVALID_PORTIONS', 'Vérifiez la composition et les âges du foyer.');
  }
  const childParts = ages.length ? ages.map(childPortionCoeff) : Array(children).fill(0.7);
  const slots: MealSlot[] = [];
  for (const [name, type] of [
    ['dejeuner', 'lunch'],
    ['diner', 'dinner'],
  ] as const) {
    if (type === 'lunch' && count < 2) continue;
    const config = ctx.mealsConfig.find((m) => m.meal_type === name);
    if (config?.generate_recipe === false || ['ecole', 'restaurant'].includes(config?.location))
      continue;
    let portions = adults + childParts.reduce((a, b) => a + b, 0);
    if (config?.portions_manual) portions = config.portions;
    else if (config?.who_eats === 'parents') portions = adults;
    else if (config?.who_eats === 'enfants') portions = childParts.reduce((a, b) => a + b, 0);
    else if (config?.who_eats === 'personnalise') {
      const members = new Map<string, number>([
        ...Array.from({ length: adults }, (_, i) => [`adulte_${i + 1}`, 1] as [string, number]),
        ...childParts.map((p, i) => [`enfant_${i}`, p] as [string, number]),
      ]);
      const selected: string[] = [...new Set<string>(config.who_eats_custom ?? [])];
      if (selected.some((id) => !members.has(id)))
        throw new MenuError(
          'INVALID_PORTIONS',
          'Un membre sélectionné pour ce repas n’existe plus.'
        );
      portions = selected.reduce((sum, id) => sum + members.get(id)!, 0);
    }
    if (!positive(portions) || portions > 50)
      throw new MenuError(
        'INVALID_PORTIONS',
        'Chaque repas doit avoir un nombre de portions positif (maximum 50).'
      );
    slots.push({
      type,
      portions: Math.round(portions * 100) / 100,
      batchCooking: !!config?.batch_cooking,
    });
  }
  if (!slots.length)
    throw new MenuError('NO_MEALS', 'Aucun repas à préparer à la maison dans votre profil.');
  return slots;
}

// Labels, ingredient aliases and existing ingredient_keys use the same vocabulary.
const ALLERGENS: Record<string, string[]> = {
  gluten: [
    'gluten',
    'ble',
    'wheat',
    'orge',
    'seigle',
    'epeautre',
    'semoule',
    'couscous',
    'boulgour',
    'pain',
    'pate',
    'farine',
  ],
  lait: [
    'lait',
    'milk',
    'dairy',
    'lactose',
    'caseine',
    'whey',
    'lactoserum',
    'beurre',
    'creme',
    'fromage',
    'parmesan',
    'mozzarella',
    'feta',
    'yaourt',
    'yogourt',
  ],
  oeuf: ['oeuf', 'egg', 'eggs', 'albumine', 'mayonnaise'],
  arachide: ['arachide', 'peanut', 'peanuts', 'cacahuete'],
  'fruits a coque': [
    'fruits a coque',
    'tree nuts',
    'nuts',
    'amande',
    'noix',
    'noisette',
    'pistache',
    'cajou',
    'pecan',
    'macadamia',
  ],
  soja: ['soja', 'soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso'],
  poisson: [
    'poisson',
    'fish',
    'saumon',
    'thon',
    'anchois',
    'sardine',
    'cabillaud',
    'colin',
    'truite',
    'maquereau',
    'haddock',
    'merlu',
    'dorade',
  ],
  crustaces: [
    'crustace',
    'shellfish',
    'shrimp',
    'crevette',
    'crabe',
    'homard',
    'langouste',
    'ecrevisse',
    'gambas',
  ],
  mollusques: [
    'mollusque',
    'mollusc',
    'moule',
    'huitre',
    'calamar',
    'poulpe',
    'seiche',
    'palourde',
    'coquille saint jacques',
  ],
  sesame: ['sesame', 'tahini', 'tahin'],
  celeri: ['celeri', 'celery'],
  moutarde: ['moutarde', 'mustard'],
  lupin: ['lupin'],
  sulfites: ['sulfite', 'sulphite', 'vin', 'wine'],
};
const MEAT = [
  'viande',
  'meat',
  'pork',
  'beef',
  'chicken',
  'poulet',
  'boeuf',
  'veau',
  'porc',
  'jambon',
  'lardon',
  'bacon',
  'dinde',
  'agneau',
  'canard',
  'lapin',
  'saucisse',
  'saucisson',
  'chorizo',
  'gelatine',
  'saindoux',
];
const tokenPatterns = new Map<string, RegExp>();
const matches = (text: string, word: string): boolean => {
  const normalized = normalize(word);
  const singular =
    normalized.length > 4 && normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
  const escaped = singular.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  if (tokenPatterns.size > 256) tokenPatterns.clear();
  if (!tokenPatterns.has(escaped))
    tokenPatterns.set(escaped, new RegExp(`(^|[^a-z0-9])${escaped}(?:s|x)?(?=$|[^a-z0-9])`));
  return tokenPatterns.get(escaped)!.test(text);
};
export function allergenKey(label: string): string {
  const n = normalize(label);
  return (
    Object.keys(ALLERGENS).find((k) =>
      ALLERGENS[k].some((alias) => n === alias || n === alias + 's')
    ) ?? n
  );
}
const dietKey = (s: unknown): string =>
  ({
    vegetalien: 'vegan',
    végétalien: 'vegan',
    vegetarian: 'vegetarien',
    pescetarian: 'pescetarien',
    kosher: 'casher',
  }[normalize(s)] ?? normalize(s));
const goalKey = (s: unknown): string =>
  ({
    'weight loss': 'perte poids',
    leger: 'perte poids',
    hypocalorique: 'perte poids',
    'muscle gain': 'prise muscle',
    'high protein': 'prise muscle',
    proteine: 'prise muscle',
    'riche en proteines': 'prise muscle',
    'proteines elevees': 'prise muscle',
    sport: 'prise muscle',
    balanced: 'equilibre',
    energy: 'energie',
    energisant: 'energie',
    pregnancy: 'grossesse',
  }[normalize(s)] ?? normalize(s));
const toolKey = (s: string): string =>
  ({
    'air fryer': 'airfryer',
    'friteuse a air': 'airfryer',
    'cocotte minute': 'autocuiseur',
    'micro onde': 'micro ondes',
    plaques: 'plaque',
    mixeur: 'blender',
    'robot de cuisine': 'robot',
    'planche a decouper': 'planche',
    'cuillere en bois': 'cuillere',
    'plat a four': 'four',
  }[normalize(s)] ?? normalize(s));

function allergiesFor(ctx: MenuContext): { key: string; traces: boolean }[] {
  const entries = ctx.allergies
    ? ctx.allergies.allergies ?? []
    : ctx.legacyPreferences.allergies ?? [];
  if (!Array.isArray(entries))
    throw new MenuError('INVALID_PROFILE', 'Les allergies du profil sont illisibles.');
  const result = entries.map((a: any) => ({
    key: allergenKey(typeof a === 'string' ? a : a?.name),
    traces: typeof a === 'object' && a?.traces_ok === true,
  }));
  // Old onboarding can populate preferences before the canonical allergy row.
  // Never erase an existing restriction just because a default row is empty.
  const legacy = ctx.legacyPreferences.allergies ?? [];
  if (!Array.isArray(legacy))
    throw new MenuError('INVALID_PROFILE', 'Les allergies historiques du profil sont illisibles.');
  for (const entry of legacy) {
    const key = allergenKey(typeof entry === 'string' ? entry : entry?.name);
    if (!result.some((a) => a.key === key)) result.push({ key, traces: false });
  }
  for (const a of textList(
    ctx.allergies ? ctx.allergies.other_allergies : ctx.legacyPreferences.autres_allergies
  ))
    result.push({ key: allergenKey(a), traces: false });
  for (const a of textList(ctx.legacyPreferences.autres_allergies))
    if (!result.some((entry) => entry.key === allergenKey(a)))
      result.push({ key: allergenKey(a), traces: false });
  for (const a of textList(ctx.household.family_allergies))
    result.push({ key: allergenKey(a), traces: false });
  if (result.some((a) => !a.key))
    throw new MenuError('INVALID_PROFILE', 'Une allergie du profil n’a pas de nom.');
  return result;
}

// Main meals each cover 35% of a DAILY target; breakfast/snacks account for the rest.
// This is a product allocation, not a medical prescription. Surface it in the menu.
export const MAIN_MEAL_SHARE = 0.35;
export const TARGET_TOLERANCE = 0.2;
export function validIngredientQuantity(ingredient: unknown): boolean {
  if (!ingredient) return false;
  const row = ingredient as Row;
  const amount =
    typeof ingredient === 'string'
      ? ingredient
      : row.quantity ??
        row.quantite ??
        row.amount ??
        row.raw ??
        row.name ??
        row.nom ??
        row.ingredient;
  if (typeof amount === 'number') return positive(amount);
  if (typeof amount !== 'string') return false;
  const structured =
    typeof ingredient !== 'string' && (row.quantity ?? row.quantite ?? row.amount) != null;
  // Keep signs and separators: text normalization would turn "-2" into "2".
  const text = amount
    .trim()
    .toLowerCase()
    .replace(/(\d)([½¼¾])/g, '$1 $2')
    .replace(/½/g, '1/2')
    .replace(/¼/g, '1/4')
    .replace(/¾/g, '3/4');
  // Unquantified seasoning stays "to taste" in the shopping list; no invented piece.
  if (!structured && /^(sel|poivre|eau)(\b|$)/.test(text)) return true;
  const quantity = String.raw`(?:\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?)`;
  const match = text.match(new RegExp(`^(${quantity})(?:\\s*[-–]\\s*(${quantity}))?(.*)$`));
  if (!match) return false;
  if (structured ? match[3].trim() !== '' : !/^[a-zà-ÿœ]/.test(match[3].trim())) return false;
  return [match[1], match[2]].filter(Boolean).every((value) => {
    const fraction = value.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
    return fraction
      ? Number(fraction[3]) > 0 &&
          positive(Number(fraction[1] || 0) + Number(fraction[2]) / Number(fraction[3]))
      : positive(Number(value.replace(',', '.')));
  });
}
export function recipeRejection(recipe: Row, ctx: MenuContext, slot: MealSlot): string | null {
  const ingredients = recipe.ingredients;
  if (
    !recipe.id ||
    !recipe.title ||
    !Array.isArray(ingredients) ||
    !ingredients.length ||
    ingredients.some(
      (i) => !(typeof i === 'string' ? i.trim() : i && (i.name || i.nom || i.ingredient || i.raw))
    ) ||
    !(
      Array.isArray(recipe.instructions) &&
      recipe.instructions.length &&
      recipe.instructions.every((s: any) => typeof s === 'string' && s.trim())
    ) ||
    !positive(recipe.base_servings) ||
    !positive(recipe.calories_kcal) ||
    ['proteins_g', 'carbs_g', 'fats_g'].some((k) => !Number.isFinite(recipe[k]) || recipe[k] < 0)
  )
    return 'incomplete_recipe';
  if (!ingredients.every(validIngredientQuantity)) return 'ingredient_quantities';
  // Inspect every source, not only ingredients_text (which can be stale).
  const haystack = normalize(
    [
      recipe.title,
      recipe.ingredients_text,
      ...ingredients.map((i) =>
        typeof i === 'string' ? i : [i.name, i.nom, i.ingredient, i.raw].join(' ')
      ),
      ...list(recipe.ingredient_keys),
      ...list(recipe.ingredient_keywords),
    ].join(' ')
  );
  const declared = list(recipe.allergens);
  const review = recipe.safety_review;
  const reviewed = !!review?.reviewed_by && !!review?.reviewed_at;
  for (const allergy of allergiesFor(ctx)) {
    const aliases =
      allergy.key === 'fruits de mer'
        ? [...ALLERGENS.crustaces, ...ALLERGENS.mollusques]
        : ALLERGENS[allergy.key] ?? [allergy.key];
    if (
      declared.some((a) => allergenKey(a) === allergy.key) ||
      aliases.some((t) => matches(haystack, t))
    )
      return 'allergen';
    // Empty/default allergen arrays are not evidence of absence. No auto-certification.
    if (!reviewed || !list(review.allergen_free).map(allergenKey).includes(allergy.key))
      return 'allergen_not_reviewed';
    if (!allergy.traces && !list(review.trace_free).map(allergenKey).includes(allergy.key))
      return 'traces_not_reviewed';
  }
  const style = ctx.foodStyle ?? {};
  const avoid = [
    ...textList(style.foods_to_avoid),
    ...textList(ctx.legacyPreferences.aliments_eviter),
  ];
  if (avoid.some((a) => (ALLERGENS[allergenKey(a)] ?? [a]).some((t) => matches(haystack, t))))
    return 'excluded_food';
  const diet = dietKey(style.diet_type ?? ctx.legacyPreferences.type_alimentation ?? 'omnivore');
  const recipeDiet = dietKey(recipe.diet_type);
  const permitted: Record<string, string[]> = {
    omnivore: ['omnivore', 'vegetarien', 'vegan', 'pescetarien', 'halal', 'casher'],
    vegetarien: ['vegetarien', 'vegan'],
    vegan: ['vegan'],
    pescetarien: ['pescetarien', 'vegetarien', 'vegan'],
    halal: ['halal', 'vegan'],
    casher: ['casher', 'vegan'],
  };
  if (!permitted[diet])
    throw new MenuError(
      'UNSUPPORTED_DIET',
      'Ce régime doit être précisé avant de proposer des recettes.'
    );
  if (
    !permitted[diet].includes(recipeDiet) &&
    !(reviewed && list(review.diets).map(dietKey).includes(diet))
  )
    return 'diet_not_verified';
  const fish = [...ALLERGENS.poisson, ...ALLERGENS.crustaces, ...ALLERGENS.mollusques];
  const exclusions =
    diet === 'vegan'
      ? [...MEAT, ...fish, ...ALLERGENS.oeuf, ...ALLERGENS.lait, 'miel']
      : diet === 'vegetarien'
      ? [...MEAT, ...fish]
      : diet === 'pescetarien'
      ? MEAT
      : ['halal', 'casher'].includes(diet)
      ? [
          'porc',
          'pork',
          'jambon',
          'bacon',
          'lardon',
          'saucisson',
          'chorizo',
          'vin',
          'biere',
          'rhum',
          'alcool',
        ]
      : [];
  if (exclusions.some((t) => matches(haystack, t))) return 'diet';
  if (
    ['halal', 'casher'].includes(diet) &&
    !(reviewed && list(review.diets).map(dietKey).includes(diet))
  )
    return 'certification_missing';
  const medical = list(ctx.profile.medical_conditions).filter((c) => c !== 'aucune');
  if (goalKey(ctx.objectives.main_goal) === 'grossesse') medical.push('grossesse');
  if (medical.some((c) => !reviewed || !list(review.medical_conditions).includes(c)))
    return 'medical_not_reviewed';
  const allowed = list(recipe.allowed_meals).length
    ? list(recipe.allowed_meals)
    : textList(recipe.meal_type);
  const aliases =
    slot.type === 'lunch'
      ? ['lunch', 'dejeuner', 'both', 'les deux', 'plat principal', 'plat']
      : ['dinner', 'diner', 'both', 'les deux', 'plat principal', 'plat'];
  if (!allowed.some((a) => aliases.includes(a))) return 'meal_type';
  const prep = textList(ctx.habits.prep_time);
  const caps: Record<string, number> = {
    'max 10min': 10,
    'max 20min': 20,
    'max 40min': 40,
    unlimited: Infinity,
    '15min': 15,
    '15 30min': 30,
    '30 45min': 45,
    'moins 10': 10,
    '10 20': 20,
    'moins 20': 20,
    '20 40': 40,
    '45min plus': Infinity,
    'plus 40': Infinity,
  };
  if (prep.some((p) => caps[p] === undefined))
    throw new MenuError('INVALID_PREP_TIME', 'Vérifiez le temps de cuisine dans votre profil.');
  const maxTime = prep.length ? Math.max(...prep.map((p) => caps[p])) : Infinity;
  if (!positive(recipe.total_time_min) || recipe.total_time_min > maxTime) return 'cooking_time';
  const tools = list(ctx.habits.available_tools ?? ctx.legacyPreferences.appliances_owned).map(
    toolKey
  );
  const requiredTools = [...list(recipe.appliances), ...list(recipe.equipment_needed)].map(toolKey);
  const basicTools = ['couteau', 'planche', 'saladier', 'bol', 'cuillere', 'spatule', 'passoire'];
  // Slash / "ou" in catalog equipment denotes alternatives, not two requirements.
  if (
    requiredTools.some(
      (t) =>
        !t
          .split(/\s*\/\s*|\s+ou\s+/)
          .some((option) => basicTools.includes(toolKey(option)) || tools.includes(toolKey(option)))
    )
  )
    return 'equipment';
  const goal = goalKey(ctx.objectives.main_goal ?? ctx.legacyPreferences.objectif_principal);
  if (goal && goal !== 'grossesse' && !list(recipe.goal_tags).map(goalKey).includes(goal))
    return 'objective';
  const kcal = ctx.nutrition.target_kcal;
  if (kcal != null && !positive(kcal))
    throw new MenuError('INVALID_TARGET', 'La cible calorique doit être positive.');
  if (kcal && Math.abs(recipe.calories_kcal / (kcal * MAIN_MEAL_SHARE) - 1) > TARGET_TOLERANCE)
    return 'calorie_target';
  if (ctx.nutrition.macros_custom) {
    const actual = [recipe.proteins_g * 4, recipe.carbs_g * 4, recipe.fats_g * 9];
    const total = actual.reduce((a, b) => a + b, 0);
    const targets = [
      ctx.nutrition.macro_protein_pct,
      ctx.nutrition.macro_carbs_pct,
      ctx.nutrition.macro_fat_pct,
    ];
    if (targets.some((t) => !positive(t)) || Math.abs(targets.reduce((a, b) => a + b, 0) - 100) > 1)
      throw new MenuError(
        'INVALID_MACROS',
        'Les pourcentages de macronutriments doivent totaliser 100 %.'
      );
    if (!total || actual.some((v, i) => Math.abs((v / total) * 100 - targets[i]) > 10))
      return 'macro_target';
  }
  if (positive(ctx.nutrition.protein_g_per_kg)) {
    if (!positive(ctx.profile.current_weight))
      throw new MenuError(
        'INVALID_TARGET',
        'Renseignez votre poids pour appliquer la cible de protéines par kg.'
      );
    if (
      recipe.proteins_g <
      ctx.nutrition.protein_g_per_kg *
        ctx.profile.current_weight *
        MAIN_MEAL_SHARE *
        (1 - TARGET_TOLERANCE)
    )
      return 'protein_target';
  }
  if (ctx.nutrition.dairy_preference === 'sans' && ALLERGENS.lait.some((t) => matches(haystack, t)))
    return 'dairy';
  const caloricGoal = normalize(ctx.nutrition.caloric_goal);
  if (
    !kcal &&
    ['hypocalorique', 'hypercalorique'].includes(caloricGoal) &&
    !list(recipe.goal_tags).some((t) =>
      caloricGoal === 'hypocalorique'
        ? goalKey(t) === 'perte poids'
        : ['hypercalorique', 'prise de masse'].includes(t)
    )
  )
    return 'caloric_goal';
  const spiceRanks: Record<string, number> = { doux: 0, moyen: 1, epice: 2, fort: 2 };
  const requestedSpice = normalize(style.spice_level);
  if (
    requestedSpice &&
    (spiceRanks[normalize(recipe.spice_level)] === undefined ||
      spiceRanks[normalize(recipe.spice_level)] > spiceRanks[requestedSpice])
  )
    return 'spice';
  if (
    style.reduce_sugar &&
    !['bas', 'faible', 'low', 'sans sucre'].includes(normalize(recipe.sugar_level))
  )
    return 'sugar';
  if (
    ['bas', 'faible'].includes(normalize(style.salt_level)) &&
    !['bas', 'faible', 'low'].includes(normalize(recipe.salt_level))
  )
    return 'salt';
  if (ctx.nutrition.track_fiber && !list(recipe.goal_tags).includes('riche en fibres'))
    return 'fiber';
  return null;
}

export function rankRecipes(
  recipes: Row[],
  ctx: MenuContext,
  slot: MealSlot,
  recent = new Set<string>()
): Row[] {
  const style = ctx.foodStyle ?? {};
  const score = (r: Row): number => {
    let n = recent.has(r.id) ? -100 : 0;
    if (list(style.favorite_cuisines).includes(normalize(r.cuisine_type))) n += 12;
    const text = normalize(JSON.stringify(r.ingredients));
    n += list(style.favorite_ingredients).filter((t) => matches(text, t)).length * 5;
    if (list(style.cooking_method).includes(normalize(r.cooking_method))) n += 5;
    if (slot.batchCooking && r.batch_cooking_friendly) n += 5;
    if (ctx.nutrition.target_kcal)
      n -= Math.abs(r.calories_kcal / (ctx.nutrition.target_kcal * MAIN_MEAL_SHARE) - 1) * 30;
    if (style.reduce_sugar && ['faible', 'low', 'sans sucre'].includes(normalize(r.sugar_level)))
      n += 4;
    if (normalize(r.spice_level) === normalize(style.spice_level)) n += 2;
    if (normalize(r.salt_level) === normalize(style.salt_level)) n += 2;
    return n;
  };
  return recipes
    .filter((r) => !recipeRejection(r, ctx, slot))
    .map((r) => ({ recipe: r, score: score(r) }))
    .sort((a, b) => b.score - a.score || a.recipe.id.localeCompare(b.recipe.id))
    .map((r) => r.recipe);
}

export function mealEntry(recipe: Row, slot: MealSlot): Row {
  return {
    recipe_id: recipe.id,
    recipe_signature: recipe.validation_signature,
    title: recipe.title,
    image_url: recipe.image_url,
    image_path: recipe.image_path,
    prep_min: recipe.prep_time_min,
    total_min: recipe.total_time_min,
    calories: recipe.calories_kcal,
    proteins_g: recipe.proteins_g,
    carbs_g: recipe.carbs_g,
    fats_g: recipe.fats_g,
    base_servings: recipe.base_servings,
    servings_used: slot.portions,
    servings: slot.portions,
    portion_factor: slot.portions / recipe.base_servings,
  };
}

export function weekStart(value?: string, now = new Date()): string {
  const date = value
    ? new Date(value + 'T00:00:00Z')
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (
    !Number.isFinite(date.getTime()) ||
    (value && (date.toISOString().slice(0, 10) !== value || date.getUTCDay() !== 1))
  )
    throw new MenuError('INVALID_WEEK', 'La semaine doit commencer un lundi valide.');
  if (!value) date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function planWeek(
  recipes: Row[],
  ctx: MenuContext,
  week: string,
  recent = new Set<string>()
): Row {
  const slots = mealSlots(ctx);
  const pools = new Map(slots.map((slot) => [slot.type, rankRecipes(recipes, ctx, slot, recent)]));
  const cells = Array.from({ length: 7 }, (_, day) =>
    slots.map((slot) => ({ day, slot, candidates: pools.get(slot.type)! }))
  ).flat();
  // Bipartite matching avoids starving a restricted slot with a greedy first choice.
  const owner = new Map<string, number>();
  const picks = new Map<number, Row>();
  function assign(index: number, seen: Set<string>): boolean {
    for (const recipe of cells[index].candidates) {
      if (seen.has(recipe.id)) continue;
      seen.add(recipe.id);
      const previous = owner.get(recipe.id);
      if (previous === undefined || assign(previous, seen)) {
        owner.set(recipe.id, index);
        picks.set(index, recipe);
        return true;
      }
    }
    return false;
  }
  for (const index of cells
    .map((_, i) => i)
    .sort((a, b) => cells[a].candidates.length - cells[b].candidates.length)) {
    if (!assign(index, new Set()))
      throw new MenuError(
        'INSUFFICIENT_COMPATIBLE_RECIPES',
        'Le catalogue ne contient pas assez de recettes vérifiées pour composer votre semaine complète avec vos contraintes. Aucun crédit n’a été débité.'
      );
  }
  const names = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const days: Row[] = names.map((name, day) => ({
    day: day + 1,
    day_index: day,
    day_name: name,
    date: new Date(Date.parse(week + 'T00:00:00Z') + day * 86400000).toISOString().slice(0, 10),
    lunch: null,
    dinner: null,
  }));
  cells.forEach((cell, index) => {
    days[cell.day][cell.slot.type] = mealEntry(picks.get(index)!, cell.slot);
  });
  return {
    version: 2,
    ai_generated: false,
    days,
    meal_slots: slots.map((s) => s.type),
    nutrition_note: ctx.nutrition.target_kcal
      ? 'Valeurs nutritionnelles par portion adulte. Chaque déjeuner ou dîner vise 35 % de votre cible calorique quotidienne (tolérance ±20 %). Les autres repas et collations restent à prévoir.'
      : 'Valeurs nutritionnelles par portion adulte. Les recettes sont sélectionnées selon votre objectif et vos préférences. Aucune cible calorique quotidienne n’est renseignée.',
    main_meal_share: MAIN_MEAL_SHARE,
  };
}

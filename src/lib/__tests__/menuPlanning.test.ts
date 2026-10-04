import { describe, expect, it } from 'vitest';
import {
  allergenKey,
  mealEntry,
  mealSlots,
  planWeek,
  rankRecipes,
  recipeRejection,
  weekStart,
  validIngredientQuantity,
  type MenuContext,
  type Row,
} from '../../../supabase/functions/_shared/menuPlanning';
import { formatPortions, parseQuantity, scaleIngredient, scaleIngredientText } from '../portions';

const context = (): MenuContext => ({
  profile: { current_weight: 70 },
  objectives: { main_goal: 'equilibre' },
  habits: {
    meals_per_day: 2,
    prep_time: ['max_40min'],
    available_tools: ['Four', 'Poêle', 'Casserole', 'Mixeur'],
  },
  mealsConfig: [],
  allergies: { allergies: [] },
  foodStyle: { diet_type: 'omnivore' },
  nutrition: {},
  household: { adults_count: 2, children_count: 2, children_ages: [2, 10] },
  lifestyle: {},
  legacyPreferences: {},
  legacyProfile: { required_fields_ok: true },
});
const recipe = (id = 'recipe-01'): Row => ({
  id,
  title: 'Riz aux légumes',
  base_servings: 2,
  ingredients: ['200 g de riz', '2 carottes', 'Sel'],
  instructions: ['Cuire le riz.', 'Cuire les carottes et assembler.'],
  total_time_min: 25,
  prep_time_min: 10,
  diet_type: 'végétarien',
  allowed_meals: ['déjeuner', 'dîner'],
  calories_kcal: 650,
  proteins_g: 30,
  carbs_g: 70,
  fats_g: 20,
  allergens: [],
  goal_tags: ['équilibré'],
  appliances: [],
  equipment_needed: ['couteau', 'planche', 'poêle/sauteuse'],
  spice_level: 'doux',
  salt_level: 'normal',
  sugar_level: 'bas',
});
const review = (allergen: string, traces = true): Row => ({
  reviewed_by: 'catalog-reviewer',
  reviewed_at: '2026-10-02',
  allergen_free: [allergen],
  trace_free: traces ? [allergen] : [],
});
const slot = { type: 'dinner' as const, portions: 3, batchCooking: false };
const pool = (n: number) =>
  Array.from({ length: n }, (_, i) => recipe(`recipe-${String(i).padStart(2, '0')}`));

it('conserve les portions décimales et le groupe présent à chaque repas', () => {
  const c = context();
  c.mealsConfig = [
    { meal_type: 'dejeuner', who_eats: 'parents', portions: 3 },
    { meal_type: 'diner', who_eats: 'famille', portions: 99 },
  ];
  expect(mealSlots(c).map((s) => s.portions)).toEqual([2, 3]);
  c.household.children_ages = [5, 10];
  expect(mealSlots(c)[1].portions).toBe(3.2);
  c.mealsConfig[0] = {
    meal_type: 'dejeuner',
    who_eats: 'personnalise',
    who_eats_custom: ['adulte_1', 'enfant_0'],
  };
  expect(mealSlots(c)[0].portions).toBe(1.5);
  c.mealsConfig[1] = { meal_type: 'diner', who_eats: 'enfants' };
  expect(mealSlots(c)[1].portions).toBe(1.2);
});
it.each([0, -1, NaN, Infinity, 51])('rejette un nombre de portions invalide : %s', (n) => {
  const c = context();
  c.mealsConfig = [{ meal_type: 'diner', portions_manual: true, portions: n }];
  expect(() => mealSlots(c)).toThrow();
});
it('respecte les portions manuelles et les repas hors domicile', () => {
  const c = context();
  c.mealsConfig = [
    { meal_type: 'dejeuner', location: 'restaurant' },
    { meal_type: 'diner', portions_manual: true, portions: 1.7 },
  ];
  expect(mealSlots(c)).toEqual([{ type: 'dinner', portions: 1.7, batchCooking: false }]);
});
it.each(['Œufs', 'oeufs', 'eggs'])('normalise les allergies aux œufs : %s', (label) =>
  expect(allergenKey(label)).toBe('oeuf')
);
it.each(['œufs', 'mayonnaise', 'albumine'])(
  'bloque %s même si les étiquettes et ingredients_text sont incomplets',
  (ingredient) => {
    const c = context();
    c.allergies = { allergies: [{ name: 'Œufs', traces_ok: true }] };
    const r = recipe();
    r.ingredients_text = 'riz et carottes';
    r.ingredients.push('1 g de ' + ingredient);
    r.safety_review = review('oeuf');
    expect(recipeRejection(r, c, slot)).toBe('allergen');
  }
);
it('ne confond pas une liste vide avec une absence d’allergènes vérifiée', () => {
  const c = context();
  c.allergies = { allergies: [{ name: 'Arachide', traces_ok: true }] };
  expect(recipeRejection(recipe(), c, slot)).toBe('allergen_not_reviewed');
  const r = recipe();
  r.safety_review = review('arachide', false);
  expect(recipeRejection(r, c, slot)).toBeNull();
  c.allergies.allergies[0].traces_ok = false;
  expect(recipeRejection(r, c, slot)).toBe('traces_not_reviewed');
  r.safety_review = review('arachide');
  expect(recipeRejection(r, c, slot)).toBeNull();
});
it('applique les allergies des proches et les allergies libres', () => {
  const c = context();
  c.household.family_allergies = 'Céleri';
  const r = recipe();
  r.ingredients.push('1 branche de céleri');
  expect(recipeRejection(r, c, slot)).toBe('allergen');
  c.household.family_allergies = null;
  c.allergies.other_allergies = 'Kiwi';
  r.ingredients.push('1 kiwi');
  expect(recipeRejection(r, c, slot)).toBe('allergen');
});
it('une ligne de profil vide ne supprime pas une allergie historique', () => {
  const c = context();
  c.legacyPreferences.allergies = ['Arachide'];
  const r = recipe();
  r.ingredients.push('1 c. à soupe d’huile d’arachide');
  expect(recipeRejection(r, c, slot)).toBe('allergen');
});
it('lit aussi les ingrédients sous forme d’objets et les clés anglaises', () => {
  const c = context();
  c.allergies = { allergies: ['Arachide'] };
  const r = recipe();
  r.ingredients = [{ nom: 'cacahuètes', quantite: 20, unite: 'g' }];
  expect(recipeRejection(r, c, slot)).toBe('allergen');
  r.ingredients = ['200 g de riz'];
  r.ingredient_keys = ['peanut'];
  expect(recipeRejection(r, c, slot)).toBe('allergen');
});
it('les exclusions alimentaires sont impératives, y compris le pluriel', () => {
  const c = context();
  c.foodStyle.foods_to_avoid = ['champignon'];
  const r = recipe();
  r.ingredients.push('100 g de champignons');
  expect(recipeRejection(r, c, slot)).toBe('excluded_food');
});
it('bloque la viande dans une recette mal étiquetée végétarienne', () => {
  const c = context();
  c.foodStyle.diet_type = 'Végétarien';
  const r = recipe();
  r.ingredients.push('150 g de bœuf');
  expect(recipeRejection(r, c, slot)).toBe('diet');
});
it('ne certifie pas un régime halal ni une condition médicale par déduction', () => {
  const c = context();
  c.foodStyle.diet_type = 'halal';
  expect(recipeRejection(recipe(), c, slot)).toBe('diet_not_verified');
  c.foodStyle.diet_type = 'omnivore';
  c.profile.medical_conditions = ['hypertension'];
  expect(recipeRejection(recipe(), c, slot)).toBe('medical_not_reviewed');
  const r = recipe();
  r.safety_review = { ...review(''), medical_conditions: ['hypertension'] };
  expect(recipeRejection(r, c, slot)).toBeNull();
});
it('le régime vegan exige une étiquette ou une revue explicite et exclut le miel', () => {
  const c = context();
  c.foodStyle.diet_type = 'vegan';
  const r = recipe();
  r.safety_review = { ...review(''), diets: ['vegan'] };
  expect(recipeRejection(r, c, slot)).toBeNull();
  r.ingredients.push('1 c. à café de miel');
  expect(recipeRejection(r, c, slot)).toBe('diet');
});
it('ne relâche pas le temps, le matériel ou le type de repas', () => {
  const c = context();
  const r = recipe();
  c.habits.prep_time = ['max_20min'];
  expect(recipeRejection(r, c, slot)).toBe('cooking_time');
  c.habits.prep_time = ['max_40min'];
  r.equipment_needed = ['wok'];
  expect(recipeRejection(r, c, slot)).toBe('equipment');
  r.equipment_needed = [];
  r.allowed_meals = ['petit déjeuner'];
  expect(recipeRejection(r, c, slot)).toBe('meal_type');
});
it('applique le niveau d’épices, les produits laitiers et la réduction de sucre', () => {
  const c = context();
  c.foodStyle.spice_level = 'doux';
  const r = recipe();
  r.spice_level = 'épicé';
  expect(recipeRejection(r, c, slot)).toBe('spice');
  r.spice_level = 'doux';
  c.nutrition.dairy_preference = 'sans';
  r.ingredients.push('1 yaourt');
  expect(recipeRejection(r, c, slot)).toBe('dairy');
  r.ingredients = ['100 g de riz'];
  c.foodStyle.reduce_sugar = true;
  r.sugar_level = 'normal';
  expect(recipeRejection(r, c, slot)).toBe('sugar');
});
it('utilise le vocabulaire réel du catalogue pour les objectifs', () => {
  const c = context();
  c.objectives.main_goal = 'prise_muscle';
  const r = recipe();
  expect(recipeRejection(r, c, slot)).toBe('objective');
  r.goal_tags = ['protéiné'];
  expect(recipeRejection(r, c, slot)).toBeNull();
  c.objectives.main_goal = 'perte_poids';
  r.goal_tags = ['léger'];
  expect(recipeRejection(r, c, slot)).toBeNull();
});
it('respecte une cible calorique par personne, même si un seul repas est généré', () => {
  const c = context();
  c.nutrition.target_kcal = 2000;
  c.habits.meals_per_day = 1;
  const r = recipe();
  expect(recipeRejection(r, c, slot)).toBeNull();
  r.calories_kcal = 1800;
  expect(recipeRejection(r, c, slot)).toBe('calorie_target');
});
it('lit current_weight pour appliquer la cible de protéines', () => {
  const c = context();
  c.nutrition.protein_g_per_kg = 2;
  const r = recipe();
  expect(recipeRejection(r, c, slot)).toBe('protein_target');
  r.proteins_g = 45;
  expect(recipeRejection(r, c, slot)).toBeNull();
});
it('valide les macros et refuse une recette aux données manquantes', () => {
  const c = context();
  c.nutrition.macros_custom = true;
  c.nutrition.macro_protein_pct = 40;
  c.nutrition.macro_carbs_pct = 30;
  c.nutrition.macro_fat_pct = 30;
  expect(recipeRejection(recipe(), c, slot)).toBe('macro_target');
  c.nutrition.macros_custom = false;
  for (const field of [
    'ingredients',
    'instructions',
    'base_servings',
    'calories_kcal',
    'proteins_g',
  ]) {
    const r = recipe();
    r[field] = null;
    expect(recipeRejection(r, c, slot)).toBe('incomplete_recipe');
  }
});
it('fournit exactement 7 jours, 14 repas distincts et les bonnes dates', () => {
  const menu = planWeek(pool(20), context(), '2026-09-28');
  expect(menu.days).toHaveLength(7);
  expect(menu.days[6].date).toBe('2026-10-04');
  const meals = menu.days.flatMap((d) => [d.lunch, d.dinner]);
  expect(new Set(meals.map((m) => m.recipe_id)).size).toBe(14);
  expect(meals.every((m) => m.servings_used === 3 && m.portion_factor === 1.5)).toBe(true);
});
it('ne livre jamais une semaine partielle quand le catalogue est insuffisant', () =>
  expect(() => planWeek(pool(13), context(), '2026-09-28')).toThrow(/semaine complète/));
it('compose aussi une semaine complète de dîners uniquement', () => {
  const c = context();
  c.habits.meals_per_day = 1;
  const m = planWeek(pool(7), c, '2026-09-28');
  expect(m.days.every((d) => !d.lunch && d.dinner)).toBe(true);
});
it('trouve une affectation complète lorsque les déjeuners sont plus contraints', () => {
  const recipes = pool(14);
  recipes.slice(7).forEach((r) => (r.allowed_meals = ['dîner']));
  expect(planWeek(recipes, context(), '2026-09-28').days.every((d) => d.lunch && d.dinner)).toBe(
    true
  );
});
it('les préférences et l’historique influencent le classement des recettes admissibles', () => {
  const c = context();
  c.foodStyle.favorite_cuisines = ['Italienne'];
  const recipes = pool(3);
  recipes[2].cuisine_type = 'italienne';
  expect(rankRecipes(recipes, c, slot)[0].id).toBe('recipe-02');
  expect(rankRecipes(recipes, c, slot, new Set(['recipe-02']))[0].id).not.toBe('recipe-02');
});
it('les calories sont par portion et ne sont pas multipliées par le foyer', () =>
  expect(mealEntry(recipe(), slot)).toMatchObject({
    calories: 650,
    servings_used: 3,
    portion_factor: 1.5,
  }));
it.each(['2026-02-30', '2026-10-03', 'not-a-date'])('refuse une semaine invalide : %s', (date) =>
  expect(() => weekStart(date)).toThrow()
);

describe('quantités de recettes', () => {
  it.each([
    ['1/2 citron', 2, '1 citron'],
    ['1 1/2 c. à soupe', 2, '3 c. à soupe'],
    ['1½ c. à soupe', 2, '3 c. à soupe'],
    ['½–¾ l de lait', 2, '1–1.5 l de lait'],
    ['½ citron', 0.5, '0.25 citron'],
    ['1,5 l de lait', 2, '3 l de lait'],
    ['2–3 carottes', 2, '4–6 carottes'],
    ['200g de riz', 0.5, '100g de riz'],
    ['Sel', 3, 'Sel'],
  ])('ajuste %s × %s', (text, factor, expected) =>
    expect(scaleIngredientText(String(text), Number(factor))).toBe(expected)
  );
  it('préserve les décimales, fractions et champs français des objets', () => {
    expect(scaleIngredient({ nom: 'riz', quantite: '200', unite: 'g' }, 0.75)).toBe('150 g riz');
    expect(scaleIngredient({ name: 'huile', quantity: '1/2', unit: 'tbsp' }, 2)).toBe(
      '1 tbsp huile'
    );
  });
  it('ne prend pas 1/0 ou une chaîne arbitraire pour une quantité', () => {
    expect(parseQuantity('1/0')).toBeNull();
    expect(parseQuantity('2 pommes')).toBeNull();
  });
  it('bloque les quantités négatives, nulles ou mal formées avant génération', () => {
    for (const value of [
      '-2 g de riz',
      '0 g de riz',
      '1/0 citron',
      '2/-3 carottes',
      '2..3 g de riz',
      '2',
      { name: 'riz', quantity: '200 environ', unit: 'g' },
      { name: 'riz', quantity: '-2', unit: 'g' },
    ])
      expect(validIngredientQuantity(value), JSON.stringify(value)).toBe(false);
    for (const value of [
      '1½ citron',
      '½–¾ l de lait',
      '200g de riz',
      { name: 'riz', quantity: '200', unit: 'g' },
    ])
      expect(validIngredientQuantity(value), JSON.stringify(value)).toBe(true);
  });
  it('ne transforme pas 10,5 portions en 11 portions', () => {
    expect(formatPortions(10.5)).toBe('10.5 portions');
  });
});

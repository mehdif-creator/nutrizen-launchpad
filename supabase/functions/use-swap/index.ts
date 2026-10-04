import { z } from 'npm:zod@3.22.4';
import {
  MenuError,
  mealEntry,
  mealSlots,
  rankRecipes,
  recipeRejection,
  weekStart,
  type Row,
} from '../_shared/menuPlanning.ts';
import {
  loadCatalog,
  loadMenu,
  loadMenuContext,
  menuEndpoint,
  priorResult,
  saveMenu,
} from '../_shared/menuService.ts';

const schema = z
  .object({
    recipe_id: z.string().uuid(),
    meal_type: z.enum(['lunch', 'dinner']),
    meal_plan_id: z.string().uuid().optional(),
    week_start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    day: z.number().int().min(0).max(6),
    request_id: z.string().uuid().optional(),
  })
  .strict();

Deno.serve(
  menuEndpoint('use-swap', async (db, userId, body) => {
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      throw new MenuError('INVALID_INPUT', 'Précisez le repas et le jour à remplacer.', 400);
    const { request_id, ...input } = parsed.data;
    const requestId = request_id ?? crypto.randomUUID();
    const prior = await priorResult(db, userId, requestId, 'swap', input);
    if (prior) return prior;
    const current = await loadMenu(db, userId, weekStart(input.week_start), input.meal_plan_id);
    if (!current)
      throw new MenuError('MENU_NOT_FOUND', 'Ce menu n’existe plus. Actualisez la page.', 404);
    const previous = current.payload?.days?.[input.day]?.[input.meal_type];
    if (!previous || previous.recipe_id !== input.recipe_id)
      throw new MenuError(
        'MENU_CHANGED',
        'Ce repas a changé. Actualisez la page avant de réessayer.',
        409
      );
    if (current.payload?.version !== 2 || current.payload.days.length !== 7)
      throw new MenuError(
        'MENU_REGENERATION_REQUIRED',
        'Régénérez cette semaine pour appliquer les contrôles de votre profil.'
      );
    const ctx = await loadMenuContext(db, userId);
    const slots = mealSlots(ctx);
    const slot = slots.find((s) => s.type === input.meal_type);
    if (!slot)
      throw new MenuError(
        'PROFILE_CHANGED',
        'Ce repas n’est plus prévu dans votre profil. Régénérez la semaine.'
      );
    const catalog = await loadCatalog(db);
    const byId = new Map(catalog.map((r) => [r.id, r]));
    const used = new Set<string>();
    for (const day of current.payload.days) {
      for (const type of ['lunch', 'dinner'] as const) {
        const meal = day[type];
        const config = slots.find((s) => s.type === type);
        if (!!meal !== !!config)
          throw new MenuError(
            'PROFILE_CHANGED',
            'Les repas du profil ont changé. Régénérez la semaine.'
          );
        if (!meal || !config) continue;
        used.add(meal.recipe_id);
        if (day === current.payload.days[input.day] && type === input.meal_type) continue;
        const recipe = byId.get(meal.recipe_id);
        if (
          !recipe ||
          recipeRejection(recipe, ctx, config) ||
          meal.servings_used !== config.portions
        )
          throw new MenuError(
            'PROFILE_CHANGED',
            'Une autre recette du menu ne correspond plus au profil. Régénérez la semaine pour tout vérifier.'
          );
      }
    }
    const replacement = rankRecipes(
      catalog.filter((r) => !used.has(r.id)),
      ctx,
      slot
    )[0];
    if (!replacement)
      throw new MenuError(
        'NO_COMPATIBLE_SWAP',
        'Aucun remplacement vérifié ne correspond à vos contraintes. Aucun crédit n’a été débité.'
      );
    const payload: Row = structuredClone(current.payload);
    payload.days[input.day][input.meal_type] = mealEntry(replacement, slot);
    return await saveMenu(db, {
      p_user_id: userId,
      p_week_start: current.week_start,
      p_request_id: requestId,
      p_action: 'swap',
      p_input: input,
      p_context: ctx,
      p_payload: payload,
      p_expected_payload: current.payload,
    });
  })
);

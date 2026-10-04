import { z } from 'npm:zod@3.22.4';
import { MenuError, planWeek, weekStart, type Row } from '../_shared/menuPlanning.ts';
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
    week_start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    request_id: z.string().uuid().optional(),
  })
  .strict();

Deno.serve(
  menuEndpoint('generate-menu', async (db, userId, body) => {
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      throw new MenuError('INVALID_INPUT', 'Paramètres de génération invalides.', 400);
    const week = weekStart(parsed.data.week_start);
    const requestId = parsed.data.request_id ?? crypto.randomUUID();
    const input = { week_start: week };
    const prior = await priorResult(db, userId, requestId, 'generate', input);
    if (prior) return prior;
    const ctx = await loadMenuContext(db, userId);
    const current = await loadMenu(db, userId, week);
    const catalog = await loadCatalog(db);
    const recent = new Set<string>(
      (current?.payload?.days ?? [])
        .flatMap((d: Row) => [d.lunch?.recipe_id, d.dinner?.recipe_id])
        .filter(Boolean)
    );
    const payload = planWeek(catalog, ctx, week, recent);
    return await saveMenu(db, {
      p_user_id: userId,
      p_week_start: week,
      p_request_id: requestId,
      p_action: 'generate',
      p_input: input,
      p_context: ctx,
      p_payload: payload,
      p_expected_payload: current?.payload ?? null,
    });
  })
);

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const uid = '11111111-1111-4111-8111-111111111111';
const uuid = (i) => `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`;
const ctx = () => ({
  profile: { current_weight: 70 },
  objectives: { main_goal: 'equilibre' },
  habits: { meals_per_day: 1, prep_time: ['max_40min'], available_tools: ['Poêle'] },
  mealsConfig: [],
  allergies: { allergies: [] },
  foodStyle: { diet_type: 'omnivore' },
  nutrition: {},
  household: { adults_count: 1, children_count: 1, children_ages: [5] },
  lifestyle: {},
  legacyPreferences: {},
  legacyProfile: { required_fields_ok: true, menu_profile_ready: true },
});
const recipe = (i) => ({
  id: uuid(i),
  title: `Riz aux légumes ${i}`,
  ingredients: ['200 g de riz'],
  instructions: ['Cuire le riz.'],
  base_servings: 2,
  calories_kcal: 650,
  proteins_g: 30,
  carbs_g: 70,
  fats_g: 20,
  diet_type: 'végétarien',
  total_time_min: 25,
  allowed_meals: ['déjeuner', 'dîner'],
  goal_tags: ['équilibré'],
  allergens: [],
  equipment_needed: ['poêle'],
  validation_signature: `signature-${i}`,
});
function harness(endpoint, overrides = {}) {
  const writes = [];
  const context = overrides.context ?? ctx();
  const catalog = overrides.catalog ?? Array.from({ length: 20 }, (_, i) => recipe(i + 1));
  const calls = [];
  const db = {
    auth: {
      getUser: async (token) => ({
        data: { user: token === 'valid' ? { id: uid } : null },
        error: token === 'valid' ? null : { message: 'invalid' },
      }),
    },
    from(table) {
      const filters = [];
      const query = {
        select() {
          return query;
        },
        eq(k, v) {
          filters.push([k, v]);
          return query;
        },
        async maybeSingle() {
          calls.push({ table, filters });
          return {
            data:
              table === 'menu_action_receipts' ? overrides.receipt ?? null : overrides.menu ?? null,
            error: null,
          };
        },
      };
      return query;
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      if (name === 'get_menu_profile_context')
        return {
          data: overrides.profileError ? null : context,
          error: overrides.profileError ? { message: 'read failure' } : null,
        };
      if (name === 'get_menu_recipe_catalog') return { data: catalog, error: null };
      if (name === 'commit_weekly_menu') {
        writes.push(args);
        if (overrides.saveThrows) throw new Error('connection reset after commit');
        if (overrides.saveError) return { data: null, error: { message: 'transport lost' } };
        return {
          data: overrides.commitResult ?? {
            success: true,
            days: args.p_payload.days,
            creditsRemaining: 50,
          },
          error: null,
        };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
  let handler;
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    cache.set(file, module.exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const runtime = {
      module,
      exports: module.exports,
      console,
      Request,
      Response,
      URL,
      Date,
      Map,
      Set,
      structuredClone,
      crypto: require('node:crypto').webcrypto,
      Deno: { env: { get: () => 'test-only' }, serve: (fn) => (handler = fn) },
      require(spec) {
        if (spec === 'npm:zod@3.22.4') return require('zod');
        if (spec.endsWith('/deps.ts')) return { createClient: () => db };
        if (spec.endsWith('/rateLimit.ts'))
          return {
            checkRateLimit: async () => ({ allowed: true }),
            rateLimitExceededResponse: () => new Response(null, { status: 429 }),
          };
        if (spec.endsWith('/security.ts'))
          return {
            getCorsHeaders: () => ({}),
            getSecurityHeaders: () => ({}),
            logEdgeFunctionError: async () => {},
          };
        return load(path.resolve(path.dirname(file), spec));
      },
    };
    vm.runInNewContext(code, runtime, { filename: file });
    return module.exports;
  }
  load(path.join(root, 'supabase/functions', endpoint, 'index.ts'));
  return {
    writes,
    calls,
    context,
    catalog,
    load,
    async run(body, token = 'valid') {
      const response = await handler(
        new Request('https://test.invalid/' + endpoint, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      );
      return { status: response.status, body: await response.json() };
    },
  };
}
const week = '2026-09-28';
function existingMenu(h) {
  const planner = h.load(path.join(root, 'supabase/functions/_shared/menuPlanning.ts'));
  return {
    menu_id: uuid(999),
    week_start: week,
    payload: planner.planWeek(h.catalog, h.context, week),
  };
}
test('generation authenticates before reading profiles or charging', async () => {
  const h = harness('generate-menu');
  const r = await h.run({}, 'invalid');
  assert.equal(r.status, 401);
  assert.equal(h.calls.length, 0);
  assert.equal(h.writes.length, 0);
});
test('a profile read failure cannot silently clear allergies', async () => {
  const h = harness('generate-menu', { profileError: true });
  const r = await h.run({ week_start: week });
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'PROFILE_UNAVAILABLE');
  assert.equal(h.writes.length, 0);
});
test('an incomplete profile save prevents generation', async () => {
  const c = ctx();
  c.legacyProfile.menu_profile_ready = false;
  const h = harness('generate-menu', { context: c });
  const r = await h.run({ week_start: week });
  assert.equal(r.body.error, 'PROFILE_SAVE_INCOMPLETE');
  assert.equal(h.writes.length, 0);
});
test('too few compatible recipes cannot reach the billing transaction', async () => {
  const h = harness('generate-menu', { catalog: [recipe(1)] });
  const r = await h.run({ week_start: week });
  assert.equal(r.body.success, false);
  assert.equal(h.writes.length, 0);
});
test('generation commits exactly seven dinners at the planned portions', async () => {
  const h = harness('generate-menu');
  const r = await h.run({ week_start: week, request_id: uuid(777) });
  assert.equal(r.body.success, true);
  assert.equal(h.writes.length, 1);
  const p = h.writes[0].p_payload;
  assert.equal(p.days.length, 7);
  assert(
    p.days.every(
      (d) => d.dinner.servings_used === 1.5 && d.dinner.portion_factor === 0.75 && !d.lunch
    )
  );
  assert.equal(h.writes[0].p_request_id, uuid(777));
});
test('an ambiguous response never claims that no credits were charged', async () => {
  for (const failure of [{ saveError: true }, { saveThrows: true }]) {
    const h = harness('generate-menu', failure);
    const r = await h.run({ week_start: week });
    assert.equal(r.body.error, 'SAVE_UNCONFIRMED');
    assert(!r.body.message.includes('Aucun crédit'));
  }
});
test('a replay returns the previous result without planning or charging', async () => {
  const result = { success: true, menu_id: uuid(999) };
  const h = harness('generate-menu', {
    receipt: { action: 'generate', input: { week_start: week }, result },
  });
  assert.deepEqual((await h.run({ week_start: week, request_id: uuid(777) })).body, result);
  assert.equal(h.writes.length, 0);
  assert(!h.calls.some((c) => c.rpc === 'get_menu_recipe_catalog'));
});
test('swap requires an existing day and the current recipe', async () => {
  const h = harness('use-swap');
  const r = await h.run({ day: 0, meal_type: 'dinner', recipe_id: uuid(1) });
  assert.equal(r.status, 404);
  assert.equal(h.writes.length, 0);
});
test('swap uses the same allergy checks, keeps other meals and honors the supplied menu', async () => {
  const base = harness('generate-menu');
  const menu = existingMenu(base),
    c = ctx();
  c.allergies = { allergies: [{ name: 'Arachide', traces_ok: false }] };
  const catalog = base.catalog.map((r) => ({
    ...r,
    safety_review: {
      reviewed_by: 'reviewer',
      reviewed_at: '2026-10-02',
      allergen_free: ['arachide'],
      trace_free: ['arachide'],
    },
  }));
  const unsafe = { ...recipe(30), title: 'Recette interdite', ingredients: ['20 g de cacahuètes'] };
  catalog.unshift(unsafe);
  const h = harness('use-swap', { menu, context: c, catalog });
  const r = await h.run({
    day: 0,
    meal_type: 'dinner',
    recipe_id: menu.payload.days[0].dinner.recipe_id,
    meal_plan_id: menu.menu_id,
  });
  assert.equal(r.body.success, true);
  const p = h.writes[0].p_payload;
  assert.notEqual(p.days[0].dinner.recipe_id, unsafe.id);
  assert.deepEqual(
    JSON.parse(JSON.stringify(p.days.slice(1))),
    JSON.parse(JSON.stringify(menu.payload.days.slice(1)))
  );
  assert.equal(p.days[0].lunch, null);
  assert(h.calls.some((c) => c.filters?.some(([k, v]) => k === 'menu_id' && v === menu.menu_id)));
});
test('a newly incompatible recipe elsewhere in the week forces regeneration', async () => {
  const base = harness('generate-menu');
  const menu = existingMenu(base);
  const c = ctx();
  c.foodStyle.foods_to_avoid = ['riz'];
  const h = harness('use-swap', { menu, context: c });
  const r = await h.run({
    day: 0,
    meal_type: 'dinner',
    recipe_id: menu.payload.days[0].dinner.recipe_id,
  });
  assert.equal(r.body.error, 'PROFILE_CHANGED');
  assert.equal(h.writes.length, 0);
});

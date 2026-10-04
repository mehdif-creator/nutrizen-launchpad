import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';

let db;
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let req = 0;
const nextRequest = () => `33333333-3333-4333-8333-${String(++req).padStart(12, '0')}`;
const recipeId = (i) => `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`;
async function sourceFunction(file, name) {
  const source = await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8');
  const start = source.indexOf('CREATE OR REPLACE FUNCTION public.' + name + '(');
  assert(start >= 0, `Missing source function ${name}`);
  const body = source.slice(start);
  const delimiter = body.match(/\bAS\s+(\$\w*\$)/i)[1];
  const end =
    body.indexOf(delimiter, body.indexOf(delimiter) + delimiter.length) + delimiter.length;
  return body.slice(0, end) + ';';
}
const rpc = async (name, args = []) =>
  (
    await db.query(
      `select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as value`,
      args
    )
  ).rows[0].value;
const snapshot = () => rpc('get_menu_profile_context', [user]);
const current = async () =>
  (
    await db.query('select payload from user_weekly_menus where user_id=$1 and week_start=$2', [
      user,
      '2026-09-28',
    ])
  ).rows[0]?.payload ?? null;
const balance = async () =>
  Number(
    (
      await db.query(
        'select subscription_credits+lifetime_credits as balance from user_wallets where user_id=$1',
        [user]
      )
    ).rows[0].balance
  );
async function payload() {
  const catalog = await rpc('get_menu_recipe_catalog', [0]);
  return {
    version: 2,
    meal_slots: ['dinner'],
    days: catalog.slice(0, 7).map((r, i) => ({
      date: new Date(Date.UTC(2026, 8, 28 + i)).toISOString().slice(0, 10),
      lunch: null,
      dinner: {
        recipe_id: r.id,
        recipe_signature: r.validation_signature,
        title: r.title,
        base_servings: 2,
        servings_used: 1.5,
        portion_factor: 0.75,
      },
    })),
  };
}
async function save(p, options = {}) {
  return rpc('commit_weekly_menu', [
    user,
    '2026-09-28',
    options.request ?? nextRequest(),
    options.action ?? 'generate',
    options.input ?? { week_start: '2026-09-28' },
    options.context ?? (await snapshot()),
    p,
    options.expected === undefined ? await current() : options.expected,
  ]);
}
await (async () => {
  db = new PGlite({ extensions: { unaccent } });
  await db.exec(`
 CREATE EXTENSION unaccent;
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT jsonb_build_object('role',COALESCE(NULLIF(current_setting('request.jwt.claim.role',true),''),'service_role')) $$;
 CREATE TABLE profiles(id uuid PRIMARY KEY,household_adults int,household_children int,kid_portion_ratio numeric,meals_per_day int,required_fields_ok boolean);
 CREATE TABLE user_profile(user_id uuid PRIMARY KEY,current_weight numeric,medical_conditions text[]);
 CREATE TABLE user_objectives(user_id uuid PRIMARY KEY,main_goal text);
 CREATE TABLE user_eating_habits(user_id uuid PRIMARY KEY,meals_per_day int);
 CREATE TABLE user_meals_config(user_id uuid,meal_type text,portions numeric);
 CREATE TABLE user_allergies(user_id uuid PRIMARY KEY,allergies jsonb);
 CREATE TABLE user_food_style(user_id uuid PRIMARY KEY,diet_type text);
 CREATE TABLE user_nutrition_goals(user_id uuid PRIMARY KEY,target_kcal numeric);
 CREATE TABLE user_household(user_id uuid PRIMARY KEY,adults_count int,children_count int,children_ages int[]);
 CREATE TABLE user_lifestyle(user_id uuid PRIMARY KEY);
 CREATE TABLE preferences(user_id uuid PRIMARY KEY,allergies text[]);
 CREATE TABLE recipes(id uuid PRIMARY KEY,title text,published boolean,ingredients jsonb,base_servings int,calories_kcal numeric,updated_at timestamptz);
 CREATE TABLE user_weekly_menus(menu_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id),week_start date,payload jsonb,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),UNIQUE(user_id,week_start));
 CREATE TABLE user_weekly_menu_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),weekly_menu_id uuid REFERENCES user_weekly_menus(menu_id),recipe_id uuid REFERENCES recipes(id),day_of_week int CHECK(day_of_week BETWEEN 1 AND 7),meal_slot text,target_servings int,portion_factor numeric,scale_factor numeric,UNIQUE(weekly_menu_id,day_of_week,meal_slot));
 CREATE TABLE user_daily_recipes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,date date,lunch_recipe_id uuid,dinner_recipe_id uuid,UNIQUE(user_id,date));
 CREATE TABLE feature_costs(feature text PRIMARY KEY,cost int);
 CREATE TABLE user_wallets(user_id uuid PRIMARY KEY,subscription_credits int,lifetime_credits int,credits_total int,updated_at timestamptz);
 CREATE TABLE credit_transactions(id uuid DEFAULT gen_random_uuid(),user_id uuid,delta int,reason text,credit_type text,feature text,metadata jsonb);
 INSERT INTO auth.users VALUES('${user}'),('${other}');
 INSERT INTO profiles VALUES('${user}',4,0,.7,1,true);
 INSERT INTO user_profile VALUES('${user}',70,NULL);
 INSERT INTO user_allergies VALUES('${user}','[]');
 INSERT INTO user_wallets VALUES('${user}',100,0,100,now());
 INSERT INTO feature_costs VALUES('generate_week_1',6),('generate_week_2',11),('swap',1);
 `);
  // Execute the repository's actual pre-existing helpers, not stubs for billing/parsing.
  for (const [file, name] of [
    ['20260323090724_23cdfbbc-cce5-4e85-ae3c-e6c9691b290b.sql', 'check_and_consume_credits'],
    ['20260301125322_5157ab4d-f6fe-450f-a89e-de25df8afe55.sql', 'parse_ingredient_line'],
  ])
    await db.exec(await sourceFunction(file, name));
  // normalize_str's latest definition lives in a historical migration; locate it deterministically.
  const { readdir } = await import('node:fs/promises');
  let normalize;
  for (const file of (await readdir(new URL('../supabase/migrations/', import.meta.url))).sort()) {
    const src = await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8');
    if (src.includes('CREATE OR REPLACE FUNCTION public.normalize_str(')) normalize = file;
  }
  await db.exec(await sourceFunction(normalize, 'normalize_str'));
  await db.exec(
    await readFile(
      new URL(
        '../supabase/migrations/20261002060229_menu_profile_consistency.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
  for (let i = 1; i <= 15; i++)
    await db.query(
      'insert into recipes(id,title,published,ingredients,base_servings,calories_kcal) values($1,$2,true,$3,2,650)',
      [
        recipeId(i),
        `Recette ${i}`,
        JSON.stringify(['200 g de riz', '1/2 citron', { nom: 'huile', quantite: 20, unite: 'ml' }]),
      ]
    );
})();

await test('saves all projections and charges once, retaining decimal portions', async () => {
  const id = nextRequest();
  const p = await payload();
  const result = await save(p, { request: id });
  assert.equal(result.success, true);
  assert.equal(await balance(), 94);
  assert.equal(
    (await db.query('select count(*)::int as n from user_weekly_menu_items')).rows[0].n,
    7
  );
  assert.equal((await db.query('select count(*)::int as n from user_daily_recipes')).rows[0].n, 7);
  assert.equal(
    Number(
      (await db.query('select target_servings from user_weekly_menu_items limit 1')).rows[0]
        .target_servings
    ),
    1.5
  );
  const retry = await save(p, { request: id, expected: null });
  assert.deepEqual(retry, result);
  assert.equal(await balance(), 94);
});
await test('shopping quantities use planned portions, JSON quantities and fractions', async () => {
  const rows = (
    await db.query('select * from get_shopping_list_from_weekly_menu($1,$2)', [user, '2026-09-28'])
  ).rows;
  assert.equal(Number(rows.find((r) => r.ingredient_name === 'riz').total_quantity), 1050);
  assert.equal(Number(rows.find((r) => r.ingredient_name === 'citron').total_quantity), 2.625);
  assert.equal(Number(rows.find((r) => r.ingredient_name === 'huile').total_quantity), 105);
});
await test('quantities preserve structured fields, ranges, fractions, units and seasoning', async () => {
  for (const [ingredient, qty, unit, name] of [
    [{ name: 'riz', quantity: 200, unit: 'g' }, 200, 'g', 'riz'],
    [{ nom: 'huile', quantite: '1/2', unite: 'l' }, 0.5, 'l', 'huile'],
    ['2–3 carottes', 3, 'piece', 'carottes'],
    ['½–¾ l de lait', 0.75, 'l', 'lait'],
    ['1½ citron', 1.5, 'piece', 'citron'],
    ['Sel', null, 'as_needed', 'Sel'],
  ]) {
    const row = (
      await db.query('select * from parse_menu_ingredient($1)', [JSON.stringify(ingredient)])
    ).rows[0];
    assert.equal(row.quantity === null ? null : Number(row.quantity), qty);
    assert.equal(row.canonical_unit, unit);
    assert.equal(row.ingredient_name, name);
  }
  for (const ingredient of ['-2 g de riz', '0 g de riz', '1/0 citron'])
    await assert.rejects(() =>
      db.query('select * from parse_menu_ingredient($1)', [JSON.stringify(ingredient)])
    );
});
await test('a missing day, duplicate recipe or invalid factor cannot alter the menu or wallet', async () => {
  const original = await current(),
    credits = await balance();
  for (const corrupt of [
    (p) => p.days.pop(),
    (p) => (p.days[1].dinner = { ...p.days[0].dinner }),
    (p) => (p.days[0].dinner.portion_factor = -1),
  ]) {
    const p = await payload();
    corrupt(p);
    await assert.rejects(() => save(p));
    assert.deepEqual(await current(), original);
    assert.equal(await balance(), credits);
  }
});
await test('an insertion failure after debit rolls back menu, all projections and credits', async () => {
  const original = await current(),
    credits = await balance();
  await db.exec(
    `CREATE FUNCTION fail_menu_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected storage failure'; END $$; CREATE TRIGGER injected_failure BEFORE INSERT ON user_daily_recipes FOR EACH ROW EXECUTE FUNCTION fail_menu_test();`
  );
  const p = await payload();
  await assert.rejects(() => save(p));
  assert.deepEqual(await current(), original);
  assert.equal(await balance(), credits);
  assert.equal(
    (await db.query('select count(*)::int as n from user_weekly_menu_items')).rows[0].n,
    7
  );
  await db.exec(
    'DROP TRIGGER injected_failure ON user_daily_recipes; DROP FUNCTION fail_menu_test();'
  );
});
await test('insufficient credits does not replace an existing menu', async () => {
  const original = await current();
  await db.query(
    'update user_wallets set subscription_credits=0,lifetime_credits=0,credits_total=0 where user_id=$1',
    [user]
  );
  const result = await save(await payload());
  assert.equal(result.success, false);
  assert.equal(result.error_code, 'INSUFFICIENT_CREDITS');
  assert.deepEqual(await current(), original);
  await db.query(
    'update user_wallets set subscription_credits=94,credits_total=94 where user_id=$1',
    [user]
  );
});
await test('a stale generation does not overwrite a newer one', async () => {
  const credits = await balance();
  const result = await save(await payload(), { expected: null });
  assert.equal(result.error_code, 'MENU_CHANGED');
  assert.equal(await balance(), credits);
});
await test('profile changes during generation are rejected without charge', async () => {
  const c = await snapshot(),
    credits = await balance();
  await db.query('update user_profile set current_weight=71 where user_id=$1', [user]);
  const result = await save(await payload(), { context: c });
  assert.equal(result.error_code, 'PROFILE_CHANGED');
  assert.equal(await balance(), credits);
  assert.equal(
    (await rpc('get_visible_weekly_menu', [user, '2026-09-28'])).needs_regeneration,
    true
  );
  assert.deepEqual(await rpc('get_weekly_recipes_by_day', [user, '2026-09-28']), []);
  await assert.rejects(() =>
    db.query('select * from get_shopping_list_from_weekly_menu($1,$2)', [user, '2026-09-28'])
  );
  await db.query('update user_profile set current_weight=70 where user_id=$1', [user]);
});
await test('swaps exactly one dinner, leaves the nested shape and charges once', async () => {
  const original = await current(),
    p = structuredClone(original),
    catalog = await rpc('get_menu_recipe_catalog', [0]),
    r = catalog[7];
  p.days[0].dinner = {
    ...p.days[0].dinner,
    recipe_id: r.id,
    recipe_signature: r.validation_signature,
    title: r.title,
  };
  const input = { day: 0, meal_type: 'dinner', recipe_id: original.days[0].dinner.recipe_id };
  const request = nextRequest(),
    credits = await balance();
  const result = await save(p, { action: 'swap', input, request });
  assert.equal(result.success, true);
  assert.equal(await balance(), credits - 1);
  assert.deepEqual((await current()).days.slice(1), original.days.slice(1));
  assert.equal((await current()).days[0].lunch, null);
  assert.equal(
    (
      await db.query('select dinner_recipe_id from user_daily_recipes where date=$1', [
        '2026-09-28',
      ])
    ).rows[0].dinner_recipe_id,
    r.id
  );
  assert.deepEqual(await save(p, { action: 'swap', input, request }), result);
  assert.equal(await balance(), credits - 1);
});
await test('recipe changes invalidate old menus and their safety review', async () => {
  await db.query('update recipes set safety_review=$2 where id=$1', [
    recipeId(8),
    JSON.stringify({ reviewed_by: 'reviewer', reviewed_at: '2026-10-02', allergen_free: ['oeuf'] }),
  ]);
  await db.query('update recipes set ingredients=$2 where id=$1', [
    recipeId(8),
    JSON.stringify(['1 œuf']),
  ]);
  assert.equal(
    (await db.query('select safety_review from recipes where id=$1', [recipeId(8)])).rows[0]
      .safety_review,
    null
  );
  assert.equal(
    (await rpc('get_visible_weekly_menu', [user, '2026-09-28'])).needs_regeneration,
    true
  );
});
await test('reads are restricted to the owner and write RPCs to the service role', async () => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
  await assert.rejects(() => rpc('get_visible_weekly_menu', [user, '2026-09-28']), /Access denied/);
  const acl = (
    await db.query(
      "select has_function_privilege('authenticated','public.commit_weekly_menu(uuid,date,uuid,text,jsonb,jsonb,jsonb,jsonb)','EXECUTE') as write, has_function_privilege('anon','public.get_menu_profile_context(uuid)','EXECUTE') as profile, has_table_privilege('authenticated','public.menu_action_receipts','SELECT') as receipts"
    )
  ).rows[0];
  assert.deepEqual(acl, { write: false, profile: false, receipts: false });
});

await db.close();

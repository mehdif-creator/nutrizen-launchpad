import { createClient } from './deps.ts';
import { checkRateLimit, rateLimitExceededResponse } from './rateLimit.ts';
import { getCorsHeaders, getSecurityHeaders, logEdgeFunctionError } from './security.ts';
import { MenuError, type MenuContext, type Row } from './menuPlanning.ts';

export async function loadMenuContext(db: any, userId: string): Promise<MenuContext> {
  const { data, error } = await db.rpc('get_menu_profile_context', { p_user_id: userId });
  if (error || !data)
    throw new MenuError(
      'PROFILE_UNAVAILABLE',
      'Impossible de vérifier votre profil. Réessayez plus tard.',
      503
    );
  if (!data.legacyProfile?.required_fields_ok)
    throw new MenuError('PROFILE_INCOMPLETE', 'Complétez votre profil avant de générer vos menus.');
  if (data.legacyProfile.menu_profile_ready !== true)
    throw new MenuError(
      'PROFILE_SAVE_INCOMPLETE',
      'Terminez la sauvegarde de votre profil avant de générer des menus.'
    );
  return data;
}

export async function loadCatalog(db: any): Promise<Row[]> {
  const result: Row[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.rpc('get_menu_recipe_catalog', { p_offset: offset });
    if (error || !data)
      throw new MenuError(
        'CATALOG_UNAVAILABLE',
        'Le catalogue ne peut pas être vérifié actuellement.',
        503
      );
    result.push(...data);
    if (data.length < 500) return result;
    if (offset >= 19500)
      throw new MenuError(
        'CATALOG_TOO_LARGE',
        'Le catalogue nécessite une sélection paginée plus précise.',
        503
      );
  }
}

export async function loadMenu(
  db: any,
  userId: string,
  week: string,
  menuId?: string
): Promise<Row | null> {
  let query = db.from('user_weekly_menus').select('*').eq('user_id', userId);
  query = menuId ? query.eq('menu_id', menuId) : query.eq('week_start', week);
  const { data, error } = await query.maybeSingle();
  if (error)
    throw new MenuError('MENU_UNAVAILABLE', 'Impossible de charger le menu existant.', 503);
  return data;
}

export function menuEndpoint(
  name: string,
  action: (db: any, userId: string, input: Row) => Promise<Row>
) {
  return async (req: Request): Promise<Response> => {
    const cors = getCorsHeaders(req.headers.get('origin'));
    const headers = { ...cors, ...getSecurityHeaders(), 'Content-Type': 'application/json' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST')
      return new Response(JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED' }), {
        status: 405,
        headers,
      });
    try {
      const db = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) throw new MenuError('UNAUTHORIZED', 'Reconnectez-vous pour continuer.', 401);
      const {
        data: { user },
        error,
      } = await db.auth.getUser(token);
      if (error || !user)
        throw new MenuError('UNAUTHORIZED', 'Reconnectez-vous pour continuer.', 401);
      const rl = await checkRateLimit(db, {
        identifier: `user:${user.id}`,
        endpoint: name,
        maxTokens: name === 'generate-menu' ? 2 : 10,
        refillRate: 1,
        cost: 1,
      });
      if (!rl.allowed) return rateLimitExceededResponse(cors, rl.retryAfter);
      const raw = await req.text();
      let input: Row;
      try {
        input = raw ? JSON.parse(raw) : {};
      } catch {
        throw new MenuError('INVALID_INPUT', 'Requête JSON invalide.', 400);
      }
      const result = await action(db, user.id, input);
      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      if (!(error instanceof MenuError)) await logEdgeFunctionError(name, error).catch(() => {});
      const code = error instanceof MenuError ? error.code : 'MENU_SAVE_FAILED';
      const message =
        error instanceof MenuError
          ? error.message
          : 'La demande n’a pas pu être confirmée. Actualisez la page puis réessayez la même demande.';
      return new Response(
        JSON.stringify({ success: false, error: code, error_code: code, message }),
        { status: error instanceof MenuError ? error.status : 500, headers }
      );
    }
  };
}

export async function priorResult(
  db: any,
  userId: string,
  requestId: string,
  action: string,
  input: Row
): Promise<Row | null> {
  const { data, error } = await db
    .from('menu_action_receipts')
    .select('action, input, result')
    .eq('user_id', userId)
    .eq('request_id', requestId)
    .maybeSingle();
  if (error) throw new MenuError('MENU_UNAVAILABLE', 'Impossible de vérifier cette demande.', 503);
  if (!data) return null;
  if (
    data.action !== action ||
    JSON.stringify(data.input, Object.keys(data.input).sort()) !==
      JSON.stringify(input, Object.keys(input).sort())
  )
    throw new MenuError(
      'REQUEST_CONFLICT',
      'Cette demande a déjà été utilisée pour une autre opération.',
      409
    );
  return data.result;
}

export async function saveMenu(db: any, args: Row): Promise<Row> {
  let result;
  try {
    result = await db.rpc('commit_weekly_menu', args);
  } catch {
    // A rejected fetch can also follow a successful commit.
    result = { data: null, error: true };
  }
  const { data, error } = result;
  // A transport failure can happen AFTER commit. Never claim it implies no charge.
  if (error || !data)
    throw new MenuError(
      'SAVE_UNCONFIRMED',
      'La confirmation du menu n’a pas été reçue. Actualisez la page ou réessayez : la même demande ne sera pas débitée deux fois.',
      503
    );
  return data;
}

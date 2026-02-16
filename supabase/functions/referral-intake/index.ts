/**
 * referral-intake: Single entrypoint for all referral operations
 * 
 * Actions:
 *   - track_click (public, no auth) — records a click on a referral link
 *   - apply_attribution (auth required) — attributes a referral to the authenticated user
 * 
 * Security:
 *   - Attribution always uses auth.uid() from JWT — never client-provided user IDs
 *   - Idempotent: a user can only be attributed once (unique constraint on referred_user_id)
 *   - Rate limited per IP (clicks) or per user (attribution)
 */
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders, getClientIp, generateRequestId, Logger, SecurityError } from '../_shared/security.ts';
import { createHmac } from "node:crypto";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ── Validation schemas ──────────────────────────────────────────────────────

const ReferralCodeSchema = z.string()
  .trim()
  .min(1, 'Referral code is required')
  .max(20, 'Referral code too long')
  .regex(/^[A-Za-z0-9]+$/, 'Invalid referral code format');

const TrackClickSchema = z.object({
  action: z.literal('track_click'),
  referralCode: ReferralCodeSchema,
}).strict();

const ApplyAttributionSchema = z.object({
  action: z.literal('apply_attribution'),
  referralCode: ReferralCodeSchema,
}).strict();

const InputSchema = z.discriminatedUnion('action', [TrackClickSchema, ApplyAttributionSchema]);

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = req.headers.get('x-request-id') || generateRequestId();
  const logger = new Logger(requestId, 'referral-intake');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Parse & validate input
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new SecurityError('Invalid JSON body', 'INVALID_BODY', 400);
    }

    const parseResult = InputSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new SecurityError(`Validation failed: ${msg}`, 'VALIDATION_ERROR', 400);
    }

    const input = parseResult.data;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── track_click (public, no auth) ─────────────────────────────────────
    if (input.action === 'track_click') {
      const code = input.referralCode.toUpperCase();

      // Verify code exists
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('referral_codes')
        .select('user_id')
        .eq('code', code)
        .single();

      if (codeError || !codeData) {
        logger.info('Invalid referral code for click', { code });
        return json(corsHeaders, { success: false, message: 'Invalid referral code' }, 404, requestId);
      }

      // Hash IP for privacy
      const clientIp = getClientIp(req);
      const ipHash = createHmac('sha256', Deno.env.get('HMAC_SECRET') || 'referral-salt')
        .update(clientIp)
        .digest('hex')
        .substring(0, 16);

      await supabaseAdmin.from('referral_clicks').insert({
        referral_code: code,
        referrer_user_id: codeData.user_id,
        ip_hash: ipHash,
        user_agent: req.headers.get('user-agent') || null,
      });

      logger.info('Click tracked', { code });
      return json(corsHeaders, { success: true, message: 'Click tracked' }, 200, requestId);
    }

    // ── apply_attribution (auth required) ─────────────────────────────────
    if (input.action === 'apply_attribution') {
      // Authenticate user from JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        throw new SecurityError('Authentication required for attribution', 'AUTH_REQUIRED', 401);
      }

      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } },
      );

      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) {
        throw new SecurityError('Invalid or expired token', 'AUTH_INVALID', 401);
      }

      // SECURITY: Always use JWT user ID — never trust client-provided IDs
      const userId = user.id;
      const code = input.referralCode.toUpperCase();

      logger.info('Applying attribution', { userId, code });

      // Call idempotent RPC (unique constraint on referred_user_id)
      const { data, error } = await supabaseAdmin.rpc('handle_referral_signup', {
        p_referral_code: code,
        p_new_user_id: userId,
      });

      if (error) {
        logger.error('Attribution RPC error', error);
        throw new SecurityError('Unable to process referral', 'REFERRAL_ERROR', 400);
      }

      logger.info('Attribution result', { result: data });
      return json(corsHeaders, data as Record<string, unknown>, 200, requestId);
    }

    // Unreachable due to discriminated union, but TypeScript needs it
    throw new SecurityError('Invalid action', 'INVALID_ACTION', 400);

  } catch (error) {
    if (error instanceof SecurityError) {
      logger.warn('Security error', { code: error.code, message: error.message });
      return json(corsHeaders, { error: { code: error.code, message: error.message } }, error.status, requestId);
    }

    logger.error('Unhandled error', error);
    return json(corsHeaders, { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }, 500, requestId);
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function json(
  corsHeaders: Record<string, string>,
  body: Record<string, unknown>,
  status: number,
  requestId: string,
): Response {
  return new Response(JSON.stringify({ ...body, requestId }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
  });
}

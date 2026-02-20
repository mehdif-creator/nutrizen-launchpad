import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitOptions {
  /** Unique key for this caller, e.g. `user:uuid` or `admin:uuid` or `ip:x.x.x.x` */
  identifier: string;
  /** Short name for the endpoint, stored in the rate-limit table */
  endpoint: string;
  /** Maximum token bucket size */
  maxTokens: number;
  /** Tokens refilled per second */
  refillRate: number;
  /** Tokens consumed per call */
  cost: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds to wait before retrying. Only present when allowed = false. */
  retryAfter?: number;
}

/**
 * Token-bucket rate limiting backed by the `check_rate_limit` Postgres RPC.
 * Fails OPEN on any DB error (returns allowed: true) to avoid blocking legitimate
 * traffic due to infrastructure issues.
 */
export async function checkRateLimit(
  client: SupabaseClient,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  try {
    const { data, error } = await client.rpc('check_rate_limit', {
      p_identifier:  opts.identifier,
      p_endpoint:    opts.endpoint,
      p_max_tokens:  opts.maxTokens,
      p_refill_rate: opts.refillRate,
      p_cost:        opts.cost,
    });

    if (error || data === null || data === undefined) {
      console.warn(`[rate-limit] DB error or null result for ${opts.endpoint}, failing open:`, error?.message);
      return { allowed: true };
    }

    if (!data.allowed) {
      const retryAfter = Math.ceil(opts.cost / Math.max(opts.refillRate, 1));
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  } catch (err) {
    console.warn(`[rate-limit] Exception for ${opts.endpoint}, failing open:`, err);
    return { allowed: true };
  }
}

/** Build a standard 429 Too Many Requests response */
export function rateLimitExceededResponse(
  corsHeaders: Record<string, string>,
  retryAfter = 60
): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

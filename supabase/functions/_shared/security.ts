/**
 * NutriZen Security Middleware for Edge Functions
 * 
 * Provides:
 * - JWT authentication & validation
 * - IDOR protection (user_id verification)
 * - Rate limiting (token bucket)
 * - CORS headers
 * - Request ID generation & structured logging
 * - Input sanitization helpers
 */

import { createClient, SupabaseClient } from './deps.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface SecurityContext {
  userId: string;
  email?: string;
  role?: string;
  requestId: string;
  ip?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  tokensRemaining?: number;
  retryAfter?: number;
}

export interface SecurityConfig {
  requireAuth?: boolean;
  rateLimit?: {
    maxTokens?: number;
    refillRate?: number;
    cost?: number;
  };
  allowedOrigins?: string[];
  validateUserIdMatch?: boolean; // IDOR protection
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ALLOWED_ORIGINS = [
  'https://mynutrizen.fr',
  'https://app.mynutrizen.fr',
  'https://www.mynutrizen.fr',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Match Lovable preview domains dynamically
const LOVABLE_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+--[a-f0-9-]+\.lovable\.app$/;

/**
 * Check if origin is allowed (includes Lovable preview domains)
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (LOVABLE_PREVIEW_PATTERN.test(origin)) return true;
  return false;
}

/**
 * Get CORS headers with strict origin validation
 * Allows production domains, localhost, and Lovable preview domains
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = isOriginAllowed(origin);
  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// Legacy export for backwards compatibility - use getCorsHeaders() instead
export const CORS_HEADERS = getCorsHeaders(null);

const DEFAULT_RATE_LIMIT = {
  maxTokens: 60,
  refillRate: 60, // tokens per minute
  cost: 1,
};

// =============================================================================
// SECURITY ERRORS
// =============================================================================

export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 403
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP from request
 */
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Structured logger with request context
 */
export class Logger {
  constructor(
    private requestId: string,
    private context: string
  ) {}

  private log(level: string, message: string, meta?: Record<string, unknown>) {
    const sanitized = this.sanitizeLogData(meta);
    console[level as 'info' | 'warn' | 'error']({
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestId,
      context: this.context,
      message,
      ...sanitized,
    });
  }

  private sanitizeLogData(data?: Record<string, unknown>): Record<string, unknown> {
    if (!data) return {};
    
    const sensitive = /password|token|secret|api[_-]?key|auth|credit|ssn/i;
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitive.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = `[TRUNCATED: ${value.length} chars]`;
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorData = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : { error: String(error) };
    this.log('error', message, { ...meta, ...errorData });
  }
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Verify JWT and extract user info
 */
export async function authenticateRequest(
  req: Request,
  supabase: SupabaseClient,
  logger: Logger
): Promise<SecurityContext> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new SecurityError('Missing or invalid authorization header', 'AUTH_REQUIRED', 401);
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.warn('Authentication failed', { error: error?.message });
      throw new SecurityError('Invalid or expired token', 'AUTH_INVALID', 401);
    }

    logger.info('User authenticated', { userId: user.id, email: user.email });

    return {
      userId: user.id,
      email: user.email,
      role: user.app_metadata?.role,
      requestId: logger['requestId'],
      ip: getClientIp(req),
    };
  } catch (err) {
    if (err instanceof SecurityError) throw err;
    logger.error('Authentication error', err);
    throw new SecurityError('Authentication failed', 'AUTH_ERROR', 500);
  }
}

// =============================================================================
// IDOR PROTECTION
// =============================================================================

/**
 * Verify that user_id in request body matches authenticated user
 * Prevents Insecure Direct Object Reference attacks
 */
export function validateUserIdMatch(
  requestBody: Record<string, unknown>,
  context: SecurityContext,
  logger: Logger
): void {
  const bodyUserId = requestBody.user_id || requestBody.userId;
  
  if (bodyUserId && bodyUserId !== context.userId) {
    logger.warn('IDOR attempt detected', {
      authenticatedUser: context.userId,
      requestedUser: bodyUserId,
    });
    throw new SecurityError(
      'User ID mismatch - cannot access other users\' data',
      'IDOR_FORBIDDEN',
      403
    );
  }
}

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Check rate limit using token bucket algorithm
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  endpoint: string,
  config: { maxTokens: number; refillRate: number; cost: number },
  logger: Logger
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_tokens: config.maxTokens,
      p_refill_rate: config.refillRate,
      p_cost: config.cost,
    });

    if (error) {
      logger.error('Rate limit check failed', error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true };
    }

    const result = data as { allowed: boolean; tokens_remaining: number; retry_after: number | null };
    
    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        identifier,
        endpoint,
        retryAfter: result.retry_after,
      });
    }

    return {
      allowed: result.allowed,
      tokensRemaining: result.tokens_remaining,
      retryAfter: result.retry_after || undefined,
    };
  } catch (err) {
    logger.error('Rate limit error', err);
    // Fail open
    return { allowed: true };
  }
}

// =============================================================================
// MAIN MIDDLEWARE
// =============================================================================

/**
 * Security middleware for edge functions
 * 
 * Usage:
 * ```typescript
 * const result = await withSecurity(req, {
 *   requireAuth: true,
 *   rateLimit: { maxTokens: 30, cost: 2 },
 *   validateUserIdMatch: true,
 * }, async (context, body, logger) => {
 *   // Your function logic here
 *   return { success: true, data: {} };
 * });
 * ```
 */
export async function withSecurity<T = unknown>(
  req: Request,
  config: SecurityConfig,
  handler: (context: SecurityContext, body: T, logger: Logger) => Promise<unknown>
): Promise<Response> {
  const requestId = req.headers.get('x-request-id') || generateRequestId();
  const endpoint = new URL(req.url).pathname;
  const logger = new Logger(requestId, endpoint);

  // CORS preflight
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    logger.info('Request received', { method: req.method, endpoint });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let body: T;
    try {
      body = await req.json() as T;
    } catch {
      throw new SecurityError('Invalid JSON body', 'INVALID_BODY', 400);
    }

    // Authentication
    let context: SecurityContext;
    if (config.requireAuth !== false) {
      context = await authenticateRequest(req, supabase, logger);
    } else {
      context = {
        userId: 'anonymous',
        requestId,
        ip: getClientIp(req),
      };
    }

    // IDOR protection
    if (config.validateUserIdMatch && body && typeof body === 'object') {
      validateUserIdMatch(body as Record<string, unknown>, context, logger);
    }

    // Rate limiting
    if (config.rateLimit) {
      const rateLimitConfig = { ...DEFAULT_RATE_LIMIT, ...config.rateLimit };
      const identifier = context.userId !== 'anonymous' 
        ? `user:${context.userId}` 
        : `ip:${context.ip}`;
      
      const rateLimit = await checkRateLimit(
        supabase,
        identifier,
        endpoint,
        rateLimitConfig,
        logger
      );

      if (!rateLimit.allowed) {
        const retryAfter = rateLimit.retryAfter || 60;
        return new Response(
          JSON.stringify({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
            },
            requestId,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              'X-RateLimit-Remaining': '0',
              'X-Request-Id': requestId,
            },
          }
        );
      }
    }

    // Execute handler
    logger.info('Executing handler');
    const result = await handler(context, body, logger);

    logger.info('Request completed successfully');
    
    // Build response payload
    const responsePayload = typeof result === 'object' && result !== null
      ? { ...(result as Record<string, unknown>), requestId }
      : { data: result, requestId };
    
    return new Response(
      JSON.stringify(responsePayload),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
      }
    );

  } catch (error) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    if (error instanceof SecurityError) {
      logger.warn('Security error', { code: error.code, message: error.message });
      return new Response(
        JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
          },
          requestId,
        }),
        {
          status: error.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          },
        }
      );
    }

    logger.error('Unhandled error', error);
    
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
        requestId,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
      }
    );
  }
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new SecurityError('Invalid email format', 'INVALID_EMAIL', 400);
  }
  
  return sanitized;
}

/**
 * Validate UUID format
 */
export function validateUuid(uuid: string, fieldName = 'id'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new SecurityError(`Invalid ${fieldName} format`, 'INVALID_UUID', 400);
  }
}

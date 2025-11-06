/**
 * Security-hardened error handling utilities
 * Sanitizes errors before sending to clients while maintaining detailed server-side logs
 */

export type ErrorCode =
  | 'AUTH_ERROR'
  | 'PERMISSION_DENIED'
  | 'RESOURCE_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CREDIT_ERROR'
  | 'RATE_LIMIT'
  | 'INTERNAL_ERROR'
  | 'DB_ERROR'
  | 'EXTERNAL_SERVICE_ERROR';

interface ErrorDetails {
  code: ErrorCode;
  userMessage: string;
  statusCode: number;
  internalDetails?: any;
  context?: Record<string, any>;
}

/**
 * Public-facing error that sanitizes sensitive information
 */
export class PublicError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly statusCode: number;
  private readonly internalDetails?: any;
  private readonly context?: Record<string, any>;

  constructor(details: ErrorDetails) {
    super(details.userMessage);
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.statusCode = details.statusCode;
    this.internalDetails = details.internalDetails;
    this.context = details.context;

    // Log internally with full details (server-side only)
    if (this.internalDetails || this.context) {
      console.error(`[${this.code}] Internal Error:`, {
        message: this.userMessage,
        details: this.internalDetails,
        context: this.context,
        stack: this.stack,
      });
    }
  }

  /**
   * Returns sanitized JSON for client response
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.userMessage,
      },
    };
  }

  /**
   * Creates HTTP Response with sanitized error
   */
  toResponse(corsHeaders?: Record<string, string>): Response {
    return new Response(
      JSON.stringify(this.toJSON()),
      {
        status: this.statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...(corsHeaders || {}),
        },
      }
    );
  }
}

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  // PostgreSQL errors
  'PGRST116': 'Resource not found',
  '23505': 'This record already exists',
  '23503': 'Invalid reference',
  '23502': 'Required field is missing',
  '42P01': 'Resource unavailable',
  
  // Supabase errors
  'NO_ROWS': 'Resource not found',
  'MULTIPLE_ROWS': 'Multiple records found',
  
  // Generic
  'default': 'An error occurred. Please try again or contact support.',
};

/**
 * Sanitizes database errors for client consumption
 */
export function sanitizeDbError(error: any, context?: Record<string, any>): PublicError {
  const errorCode = error?.code || error?.error_code || 'UNKNOWN';
  const userMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['default'];

  return new PublicError({
    code: 'DB_ERROR',
    userMessage,
    statusCode: errorCode === 'PGRST116' ? 404 : 500,
    internalDetails: {
      code: errorCode,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    },
    context,
  });
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number = 400,
  corsHeaders?: Record<string, string>
): Response {
  const error = new PublicError({
    code,
    userMessage: message,
    statusCode,
  });
  
  return error.toResponse(corsHeaders);
}

/**
 * Handles unauthorized access
 */
export function unauthorizedError(
  message: string = 'Unauthorized access',
  corsHeaders?: Record<string, string>
): Response {
  return createErrorResponse('PERMISSION_DENIED', message, 401, corsHeaders);
}

/**
 * Handles resource not found
 */
export function notFoundError(
  resource: string = 'Resource',
  corsHeaders?: Record<string, string>
): Response {
  return createErrorResponse(
    'RESOURCE_NOT_FOUND',
    `${resource} not found`,
    404,
    corsHeaders
  );
}

/**
 * Handles validation errors
 */
export function validationError(
  message: string,
  corsHeaders?: Record<string, string>
): Response {
  return createErrorResponse('VALIDATION_ERROR', message, 400, corsHeaders);
}

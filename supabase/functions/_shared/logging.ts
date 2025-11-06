/**
 * Structured logging utility with automatic redaction of sensitive data
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

/**
 * Redacts sensitive information from user IDs
 */
export function redactId(id: string | null | undefined): string {
  if (!id) return '[null]';
  if (id.length < 12) return '[invalid-id]';
  return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
}

/**
 * Redacts email addresses
 */
export function redactEmail(email: string | null | undefined): string {
  if (!email) return '[null]';
  const [local, domain] = email.split('@');
  if (!domain) return '[invalid-email]';
  
  const visibleLocal = local.length <= 2 ? local : `${local[0]}***${local[local.length - 1]}`;
  return `${visibleLocal}@${domain}`;
}

/**
 * Redacts sensitive fields from an object
 */
function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const redacted = { ...data };
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'authorization',
    'stripe_key',
    'supabase_key',
  ];

  // Redact sensitive keys
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else if (key === 'user_id' && typeof redacted[key] === 'string') {
      redacted[key] = redactId(redacted[key]);
    } else if (key === 'email' && typeof redacted[key] === 'string') {
      redacted[key] = redactEmail(redacted[key]);
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}

/**
 * Structured logger with automatic sensitive data redaction
 */
export class StructuredLogger {
  private functionName: string;
  private isProduction: boolean;

  constructor(functionName: string) {
    this.functionName = functionName;
    this.isProduction = Deno.env.get('ENVIRONMENT') === 'production';
  }

  /**
   * Logs a message with structured context
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const redactedContext = context ? redactSensitiveData(context) : undefined;

    const logEntry = {
      timestamp,
      level,
      function: this.functionName,
      message,
      ...(redactedContext && { context: redactedContext }),
    };

    // In production, don't log stack traces unless it's an error
    if (this.isProduction && level !== 'error' && context?.stack) {
      delete logEntry.context.stack;
    }

    const logMethod = level === 'error' ? console.error : 
                     level === 'warn' ? console.warn : 
                     console.log;

    logMethod(JSON.stringify(logEntry));
  }

  /**
   * Debug level logging (verbose, not shown in production)
   */
  debug(message: string, context?: LogContext) {
    if (!this.isProduction) {
      this.log('debug', message, context);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext) {
    this.log('error', message, {
      ...context,
      error_details: context?.error ? {
        name: context.error?.name,
        message: context.error?.message,
        code: context.error?.code,
        stack: this.isProduction ? undefined : context.error?.stack,
      } : undefined,
    });
  }

  /**
   * Logs successful operation
   */
  success(message: string, context?: LogContext) {
    this.info(`✅ ${message}`, context);
  }

  /**
   * Logs step in a process
   */
  step(stepNumber: number, message: string, context?: LogContext) {
    this.debug(`[Step ${stepNumber}] ${message}`, context);
  }

  /**
   * Logs API call
   */
  apiCall(method: string, path: string, context?: LogContext) {
    this.info(`API ${method} ${path}`, {
      ...context,
      http_method: method,
      path,
    });
  }

  /**
   * Logs database operation
   */
  dbOperation(operation: string, table: string, context?: LogContext) {
    this.debug(`DB ${operation} on ${table}`, {
      ...context,
      operation,
      table,
    });
  }
}

/**
 * Creates a logger instance for an edge function
 */
export function createLogger(functionName: string): StructuredLogger {
  return new StructuredLogger(functionName);
}

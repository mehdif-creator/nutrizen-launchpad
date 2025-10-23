/**
 * Centralized logging utility for NutriZen
 * Provides structured logging with context and levels
 * Automatically redacts sensitive information
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Sensitive field patterns to redact from logs
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /auth/i,
  /credit[_-]?card/i,
  /ssn/i,
];

/**
 * Redact sensitive information from log data
 */
function redactSensitiveData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
    redacted[key] = isSensitive ? '[REDACTED]' : redactSensitiveData(value);
  }

  return redacted;
}

/**
 * Format log message with timestamp and context
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | ${JSON.stringify(redactSensitiveData(context))}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Logger class with structured logging methods
 */
class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, meta?: LogContext): void {
    const formatted = formatMessage('info', `[${this.context}] ${message}`, meta);
    console.info(formatted);
  }

  warn(message: string, meta?: LogContext): void {
    const formatted = formatMessage('warn', `[${this.context}] ${message}`, meta);
    console.warn(formatted);
  }

  error(message: string, error?: Error | unknown, meta?: LogContext): void {
    const errorMeta = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
    const formatted = formatMessage('error', `[${this.context}] ${message}`, { ...meta, ...errorMeta });
    console.error(formatted);
  }

  debug(message: string, meta?: LogContext): void {
    if (import.meta.env.DEV) {
      const formatted = formatMessage('debug', `[${this.context}] ${message}`, meta);
      console.info(formatted);
    }
  }
}

/**
 * Create a logger instance with context
 * @param context - Context name (e.g., 'Dashboard', 'generateMenu')
 * @returns Logger instance
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default logger instance
 */
export const logger = createLogger('App');

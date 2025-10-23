# Security Logging Standards

**Version:** 1.0  
**Last Updated:** 2025-10-23

---

## Purpose

This document defines logging standards for NutriZen to ensure security events are captured consistently, PII is protected, and logs are useful for incident response.

---

## Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **info** | Normal operations, successful auth | User login, menu generated, swap completed |
| **warn** | Suspicious activity, rate limits | Failed auth attempt, IDOR attempt, rate limit hit |
| **error** | Errors, exceptions, security failures | Database error, invalid token, service unavailable |
| **debug** | Development only, verbose details | Request/response bodies, query parameters |

**Production:** Only log `info`, `warn`, and `error`. Never log `debug` in production.

---

## Log Format (Structured JSON)

All logs should be structured JSON with these required fields:

```json
{
  "timestamp": "2025-10-23T10:15:30.123Z",
  "level": "info",
  "requestId": "req_1729682130_abc123",
  "context": "/generate-menu",
  "message": "Menu generated successfully",
  "userId": "user-uuid-here",
  "metadata": {
    "duration_ms": 1234,
    "fallback_level": "F0"
  }
}
```

### Required Fields

- **timestamp** (ISO 8601): When the log was created
- **level** (string): One of: `info`, `warn`, `error`, `debug`
- **requestId** (string): Unique request identifier for correlation
- **context** (string): Function/module name (e.g., `/generate-menu`, `Dashboard`)
- **message** (string): Human-readable description

### Optional Fields

- **userId** (uuid): Authenticated user ID (redact in public logs)
- **ip** (string): Client IP address (hash or redact in public logs)
- **metadata** (object): Additional context (see PII restrictions below)
- **error** (object): Error details (`{ message, stack }`)
- **duration_ms** (number): Operation duration

---

## PII Redaction Rules

**NEVER LOG:**
- Passwords (plain or hashed)
- Full email addresses (only log domain: `user@***@example.com`)
- JWT tokens (full or partial)
- API keys, secrets, service role keys
- Credit card numbers, CVV
- Social security numbers
- Health data (exact weight, allergies) without user consent

**OK TO LOG:**
- User ID (UUID) - but redact in external logs
- Request ID
- Timestamp
- Operation type (e.g., "menu generated")
- Success/failure status
- Error codes (not full messages with PII)

### Automatic Redaction

The `Logger` class in `_shared/security.ts` automatically redacts:

```typescript
const sensitivePatterns = /password|token|secret|api[_-]?key|auth|credit|ssn/i;

// Before logging:
{ email: "user@example.com", password: "SecretPass123" }

// After redaction:
{ email: "user@example.com", password: "[REDACTED]" }
```

---

## Log Examples

### ✅ Good: Authentication Success

```json
{
  "timestamp": "2025-10-23T10:15:30.123Z",
  "level": "info",
  "requestId": "req_1729682130_abc123",
  "context": "/generate-menu",
  "message": "User authenticated",
  "userId": "user-uuid",
  "metadata": {
    "email": "user@example.com"
  }
}
```

### ✅ Good: Rate Limit Hit

```json
{
  "timestamp": "2025-10-23T10:20:45.789Z",
  "level": "warn",
  "requestId": "req_1729682445_def456",
  "context": "/use-swap",
  "message": "Rate limit exceeded",
  "userId": "user-uuid",
  "metadata": {
    "endpoint": "/use-swap",
    "retryAfter": 60,
    "tokensRemaining": 0
  }
}
```

### ✅ Good: IDOR Attempt

```json
{
  "timestamp": "2025-10-23T10:25:10.456Z",
  "level": "warn",
  "requestId": "req_1729682710_ghi789",
  "context": "/generate-menu",
  "message": "IDOR attempt detected",
  "userId": "attacker-uuid",
  "metadata": {
    "authenticatedUser": "attacker-uuid",
    "requestedUser": "victim-uuid"
  }
}
```

### ✅ Good: Error with Stack Trace

```json
{
  "timestamp": "2025-10-23T10:30:20.111Z",
  "level": "error",
  "requestId": "req_1729682820_jkl012",
  "context": "/generate-menu",
  "message": "Database query failed",
  "userId": "user-uuid",
  "metadata": {
    "error": {
      "message": "relation \"recipes\" does not exist",
      "stack": "Error: relation \"recipes\"...\n  at ..."
    }
  }
}
```

### ❌ Bad: Password Logged

```json
{
  "timestamp": "2025-10-23T10:35:00.000Z",
  "level": "info",
  "message": "User login attempt",
  "metadata": {
    "email": "user@example.com",
    "password": "MyPassword123!" // ❌ NEVER DO THIS
  }
}
```

### ❌ Bad: JWT Token Logged

```json
{
  "timestamp": "2025-10-23T10:40:00.000Z",
  "level": "info",
  "message": "Auth header received",
  "metadata": {
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // ❌ NEVER
  }
}
```

---

## Edge Function Logging

### Using the Logger Class

```typescript
import { Logger } from '../_shared/security.ts';

const logger = new Logger(requestId, '/my-function');

logger.info('Operation started', { userId });
logger.warn('Rate limit approaching', { tokensRemaining: 5 });
logger.error('Operation failed', new Error('Database timeout'));
```

### Log Lifecycle

1. **Request Start**: Log `info` with request ID, user ID, endpoint
2. **Authentication**: Log `info` on success, `warn` on failure
3. **Validation**: Log `warn` on invalid input
4. **Rate Limit**: Log `warn` when limit approached/exceeded
5. **Business Logic**: Log `info` for major operations
6. **Errors**: Log `error` with error message (sanitized) and stack trace
7. **Request End**: Log `info` with duration, status code

---

## Database Audit Logs

**Table:** `public.audit_log`

**Purpose:** Track data changes for compliance and forensics

**Columns:**
- `id`: UUID primary key
- `created_at`: Timestamp
- `table_name`: Affected table
- `operation`: INSERT, UPDATE, DELETE
- `user_id`: User who made the change
- `row_id`: Primary key of affected row
- `before_data`: JSONB snapshot before change
- `after_data`: JSONB snapshot after change
- `ip_address`: Client IP (optional)
- `request_id`: Correlation ID (optional)

**Retention:** 90 days (configurable via `cleanup_audit_logs()` function)

**Example Query:**

```sql
-- View recent changes to preferences
SELECT * FROM public.audit_log
WHERE table_name = 'preferences'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;

-- Find all changes by a specific user
SELECT * FROM public.audit_log
WHERE user_id = '<user-uuid>'
ORDER BY created_at DESC
LIMIT 50;
```

---

## Supabase Edge Function Logs

**Location:** Supabase Dashboard > Edge Functions > Logs

**Retention:** 7 days (Supabase default)

**Access:**
```bash
# CLI
supabase functions logs <function-name> --follow

# Dashboard
https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/functions/<function-name>/logs
```

**Filters:**
- **Level**: info, warn, error
- **Time range**: Last 1h, 24h, 7d
- **Search**: Full-text search in log messages

---

## Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| **Edge Function Logs** | 7 days | Supabase (automatic) |
| **Audit Logs** | 90 days | Postgres (`public.audit_log`) |
| **Database Logs** | 7 days | Supabase (automatic) |
| **Auth Logs** | 30 days | Supabase (automatic) |
| **Application Logs** (future) | 30 days | External (Datadog, Logtail) |

---

## External Log Aggregation (Recommended)

For production, consider shipping logs to an external service:

### Option 1: Datadog

```typescript
// In edge function
const logger = {
  info: (message: string, meta: any) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
    
    // Ship to Datadog
    fetch('https://http-intake.logs.datadoghq.com/v1/input', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': Deno.env.get('DATADOG_API_KEY'),
      },
      body: JSON.stringify({ message, ...meta }),
    });
  },
};
```

### Option 2: Logtail

```typescript
const logtail = new Logtail(Deno.env.get('LOGTAIL_TOKEN'));
logtail.info('Menu generated', { userId, duration_ms: 1234 });
```

---

## Security Alerting

### Real-Time Alerts

Configure alerts for:

1. **Failed Auth Attempts** (>10/min from same IP)
   ```sql
   SELECT COUNT(*), ip_address
   FROM auth_logs
   WHERE event = 'failed_login'
     AND timestamp > now() - interval '1 minute'
   GROUP BY ip_address
   HAVING COUNT(*) > 10;
   ```

2. **Rate Limit Exceeded** (>5/min per endpoint)
   ```sql
   SELECT COUNT(*), endpoint, identifier
   FROM rate_limits
   WHERE last_refill > now() - interval '1 minute'
   GROUP BY endpoint, identifier
   HAVING COUNT(*) > 5;
   ```

3. **IDOR Attempts**
   ```
   Filter: message = "IDOR attempt detected"
   Threshold: >3 in 5 minutes
   ```

4. **Unusual Audit Activity**
   ```sql
   SELECT COUNT(*), user_id, operation
   FROM audit_log
   WHERE created_at > now() - interval '5 minutes'
     AND operation = 'DELETE'
   GROUP BY user_id, operation
   HAVING COUNT(*) > 10;
   ```

---

## Compliance Considerations

### GDPR
- Logs containing user IDs are personal data
- Users have right to request deletion of logs
- Implement log pseudonymization for long-term retention

### HIPAA (if applicable)
- Audit logs must track all access to PHI
- Logs must be tamper-proof (immutable storage)
- Retain audit logs for 6 years

---

## Log Review Schedule

- **Daily**: Review error logs, rate limit violations
- **Weekly**: Review audit logs for anomalies
- **Monthly**: Review retention policies, cleanup old logs
- **Quarterly**: Security log analysis, trend identification

---

## Tools & Queries

### Quick Security Review

```sql
-- Top 10 most active users (last 24h)
SELECT user_id, COUNT(*) as operations
FROM audit_log
WHERE created_at > now() - interval '24 hours'
GROUP BY user_id
ORDER BY operations DESC
LIMIT 10;

-- Failed auth attempts by IP
SELECT ip_address, COUNT(*) as attempts
FROM auth_logs
WHERE event = 'failed_login'
  AND timestamp > now() - interval '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;

-- Recent deletions
SELECT * FROM audit_log
WHERE operation = 'DELETE'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

---

**Maintained by:** Security Team  
**Last Review:** 2025-10-23  
**Next Review:** 2026-01-23

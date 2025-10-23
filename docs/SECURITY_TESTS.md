# NutriZen Security Testing Guide

**Version:** 1.0  
**Last Updated:** 2025-10-23

This guide provides manual and automated security tests to verify NutriZen's security controls.

---

## 🎯 Test Categories

1. **Authentication & Authorization**
2. **Row-Level Security (RLS) / IDOR**
3. **Input Validation**
4. **Rate Limiting**
5. **XSS (Cross-Site Scripting)**
6. **CSRF (Cross-Site Request Forgery)**
7. **Security Headers**
8. **Sensitive Data Exposure**

---

## 1. Authentication & Authorization

### Test 1.1: Access Protected Route Without Auth
**Risk:** Authentication bypass  
**Expected:** Redirect to login or 401 error

```bash
# Test accessing dashboard without JWT
curl https://mynutrizen.fr/app/dashboard

# Expected: Redirect to /auth/login or "Unauthorized"
```

### Test 1.2: Invalid JWT Token
**Risk:** Token validation bypass  
**Expected:** 401 Unauthorized

```bash
# Test with invalid token
curl -H "Authorization: Bearer invalid_token_here" \
  https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu

# Expected: {"error":{"code":"AUTH_INVALID","message":"Invalid or expired token"}}
```

### Test 1.3: Expired JWT Token
**Risk:** Stale token acceptance  
**Expected:** 401 Unauthorized

```javascript
// In browser console after token expires (default 1 hour)
const { data, error } = await supabase.auth.getSession();
console.log(data.session); // Should be null

// Attempt API call
const response = await supabase.functions.invoke('generate-menu');
// Expected: error with "Invalid or expired token"
```

---

## 2. Row-Level Security (RLS) / IDOR

### Test 2.1: Read Another User's Preferences
**Risk:** IDOR (Insecure Direct Object Reference)  
**Expected:** Empty result or 403 error

```sql
-- Login as User A (ID: user-a-uuid)
-- Attempt to read User B's preferences
SELECT * FROM public.preferences 
WHERE user_id = 'user-b-uuid';

-- Expected: Empty result (RLS blocks)
```

```javascript
// Via Supabase client (logged in as User A)
const { data, error } = await supabase
  .from('preferences')
  .select('*')
  .eq('user_id', 'user-b-uuid');

console.log(data); // Expected: [] (empty)
console.log(error); // Expected: null or RLS error
```

### Test 2.2: Update Another User's Weekly Menu
**Risk:** IDOR write access  
**Expected:** 403 Forbidden or no rows updated

```javascript
// Logged in as User A
const { data, error } = await supabase
  .from('user_weekly_menus')
  .update({ payload: { malicious: 'data' } })
  .eq('user_id', 'user-b-uuid');

console.log(error); // Expected: RLS policy violation
```

### Test 2.3: Edge Function IDOR Protection
**Risk:** Middleware bypass  
**Expected:** 403 with IDOR_FORBIDDEN code

```bash
# User A's token, but requesting User B's data
TOKEN_A="<user_a_jwt>"
USER_B_ID="<user_b_uuid>"

curl -X POST \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_B_ID\"}" \
  https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu

# Expected: 
# {
#   "error": {
#     "code": "IDOR_FORBIDDEN",
#     "message": "User ID mismatch - cannot access other users' data"
#   }
# }
```

---

## 3. Input Validation

### Test 3.1: SQL Injection via Contact Form
**Risk:** SQL injection  
**Expected:** Sanitized or rejected

```bash
# Attempt SQL injection in message field
curl -X POST \
  https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/submit-contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "message": "'; DROP TABLE preferences; --"
  }'

# Expected: Message saved as plain text, no SQL executed
# Verify table still exists:
# SELECT COUNT(*) FROM preferences;
```

### Test 3.2: XSS Payload in User Input
**Risk:** Stored XSS  
**Expected:** HTML entities escaped

```javascript
// Create preference with XSS payload
await supabase
  .from('preferences')
  .update({
    cuisine_preferee: ['<script>alert("XSS")</script>', 'Française']
  })
  .eq('user_id', userId);

// Fetch and display
const { data } = await supabase
  .from('preferences')
  .select('cuisine_preferee')
  .eq('user_id', userId)
  .single();

// Display in UI
document.getElementById('cuisine').textContent = data.cuisine_preferee[0];

// Expected: Text displayed as-is, no script execution
// Actual text: <script>alert("XSS")</script>
```

### Test 3.3: Invalid Email Format
**Risk:** Malformed data acceptance  
**Expected:** 400 Validation Error

```bash
curl -X POST \
  https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/submit-lead \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email"}'

# Expected: 
# {
#   "error": {
#     "code": "VALIDATION_ERROR",
#     "message": "Validation failed: email: Invalid email format"
#   }
# }
```

### Test 3.4: Oversized Input
**Risk:** Buffer overflow, DoS  
**Expected:** 400 Validation Error

```bash
# 10,000 character string
LARGE_STRING=$(python3 -c "print('A' * 10000)")

curl -X POST \
  https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/submit-contact \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test\",
    \"email\": \"test@example.com\",
    \"message\": \"$LARGE_STRING\"
  }"

# Expected: 400 with "Message too long" error
```

---

## 4. Rate Limiting

### Test 4.1: Exceed Rate Limit (User)
**Risk:** Brute force, resource exhaustion  
**Expected:** 429 Too Many Requests after 60 requests/min

```bash
# Generate 100 requests in quick succession
TOKEN="<user_jwt>"

for i in {1..100}; do
  curl -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' \
    https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu \
    -w "\n%{http_code}\n" \
    -o /dev/null -s
done

# Expected: 
# - First 60 requests: 200 OK
# - Remaining requests: 429 with Retry-After header
```

### Test 4.2: Rate Limit Headers Present
**Risk:** Client can't handle rate limiting gracefully  
**Expected:** `X-RateLimit-Remaining` and `Retry-After` headers

```bash
TOKEN="<user_jwt>"

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu \
  -i

# Expected response headers:
# X-RateLimit-Remaining: 59
# X-Request-Id: req_1234567890_abcdef
```

### Test 4.3: Rate Limit Resets After Time
**Risk:** Permanent lockout  
**Expected:** New requests allowed after refill period

```bash
# 1. Exhaust rate limit (100 requests)
# 2. Wait 60 seconds
sleep 60

# 3. Try again
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu

# Expected: 200 OK (rate limit refilled)
```

---

## 5. XSS (Cross-Site Scripting)

### Test 5.1: Stored XSS in Profile Name
**Risk:** Persistent XSS  
**Expected:** HTML escaped, no script execution

```javascript
// Update profile with XSS payload
await supabase
  .from('profiles')
  .update({ full_name: '<img src=x onerror=alert("XSS")>' })
  .eq('id', userId);

// Display profile name in UI
const { data } = await supabase
  .from('profiles')
  .select('full_name')
  .eq('id', userId)
  .single();

document.getElementById('name').textContent = data.full_name;

// Expected: Text displayed as-is
// Actual: <img src=x onerror=alert("XSS")>
// No alert() executed
```

### Test 5.2: Reflected XSS in Error Messages
**Risk:** Reflected XSS via error handling  
**Expected:** Error message sanitized

```bash
# Trigger error with XSS payload
curl "https://mynutrizen.fr/app/recipe/<script>alert(1)</script>"

# Expected: 404 page without script execution
```

### Test 5.3: DOM-Based XSS via URL Parameters
**Risk:** DOM XSS  
**Expected:** URL params sanitized before DOM insertion

```javascript
// URL: /?redirect=javascript:alert(1)
const params = new URLSearchParams(window.location.search);
const redirect = params.get('redirect');

// Unsafe:
// window.location.href = redirect; // Would execute JS

// Safe:
if (redirect && /^https?:\/\/mynutrizen\.fr/.test(redirect)) {
  window.location.href = redirect;
} else {
  console.error('Invalid redirect');
}
```

---

## 6. CSRF (Cross-Site Request Forgery)

### Test 6.1: Cross-Origin POST Without CORS
**Risk:** CSRF attack  
**Expected:** CORS error (blocked by browser)

```html
<!-- Attacker site: evil.com -->
<form action="https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/use-swap" method="POST">
  <input name="meal_plan_id" value="<victim_menu_id>">
  <input name="day" value="0">
</form>
<script>document.forms[0].submit();</script>

<!-- Expected: CORS error in browser console -->
<!-- Access to fetch blocked by CORS policy: No 'Access-Control-Allow-Origin' header -->
```

### Test 6.2: SameSite Cookie Check
**Risk:** CSRF via cookies  
**Expected:** Cookies have `SameSite=Lax` or `Strict`

```javascript
// In browser console
document.cookie.split(';').forEach(c => console.log(c));

// Expected: Supabase auth cookies have SameSite attribute
// Example: sb-access-token=...; SameSite=Lax; Secure; HttpOnly
```

---

## 7. Security Headers

### Test 7.1: CSP Header Present
**Risk:** XSS, data injection  
**Expected:** Content-Security-Policy header

```bash
curl -I https://mynutrizen.fr

# Expected headers:
# Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://*.supabase.co; ...
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Referrer-Policy: strict-origin-when-cross-origin
```

### Test 7.2: HSTS Enforced
**Risk:** MITM downgrade attack  
**Expected:** HSTS header, HTTPS enforced

```bash
curl -I http://mynutrizen.fr

# Expected: 301 redirect to https://
# Or: Strict-Transport-Security header on HTTPS response
```

### Test 7.3: X-Frame-Options Prevents Embedding
**Risk:** Clickjacking  
**Expected:** iframe embedding blocked

```html
<!-- Attacker site: evil.com -->
<iframe src="https://mynutrizen.fr"></iframe>

<!-- Expected: Console error -->
<!-- Refused to display 'https://mynutrizen.fr' in a frame because it set 'X-Frame-Options' to 'DENY' -->
```

---

## 8. Sensitive Data Exposure

### Test 8.1: Service Role Key Not in Client Bundle
**Risk:** Full database access from client  
**Expected:** Service role key not found

```bash
# Build production bundle
npm run build

# Search for service role key
grep -r "SUPABASE_SERVICE_ROLE_KEY" dist/

# Expected: No results

# Search for key pattern (starts with "eyJ")
grep -r "eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*" dist/ | grep -v "supabase\.co"

# Expected: Only anon key found (public)
```

### Test 8.2: Password Not Logged
**Risk:** Password exposure in logs  
**Expected:** No passwords in edge function logs

```javascript
// Login attempt
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'SecretPassword123!'
});

// Check Supabase edge function logs
// https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/functions/init-user-rows/logs

// Expected: No "SecretPassword123!" in logs
// All password fields should show "[REDACTED]"
```

### Test 8.3: Audit Log Doesn't Leak PII
**Risk:** Sensitive data in audit logs  
**Expected:** PII redacted

```sql
-- Create audit log entry
UPDATE preferences SET allergies = ARRAY['peanuts'] WHERE user_id = '<user_id>';

-- Check audit log
SELECT * FROM public.audit_log 
WHERE table_name = 'preferences' 
  AND user_id = '<user_id>'
ORDER BY created_at DESC LIMIT 1;

-- Expected: before_data and after_data contain full objects
-- (Acceptable for audit purposes; RLS restricts access to admins only)
```

---

## 🤖 Automated Testing (Playwright)

### Setup

```bash
# Install Playwright
npm install -D @playwright/test

# Run tests
npx playwright test tests/security.spec.ts
```

### Sample Test: IDOR Prevention

```typescript
// tests/security.spec.ts
import { test, expect } from '@playwright/test';

test('IDOR: Cannot access other users menu', async ({ page, context }) => {
  // Login as User A
  await page.goto('/auth/login');
  await page.fill('[name="email"]', 'usera@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Get User A's JWT token
  const tokenA = await page.evaluate(() => {
    return localStorage.getItem('supabase.auth.token');
  });
  
  // Attempt to fetch User B's menu via API
  const response = await context.request.post(
    'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu',
    {
      headers: {
        'Authorization': `Bearer ${JSON.parse(tokenA).access_token}`,
        'Content-Type': 'application/json',
      },
      data: {
        user_id: '<user_b_uuid>', // Different user
      },
    }
  );
  
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.error.code).toBe('IDOR_FORBIDDEN');
});
```

### Sample Test: Rate Limiting

```typescript
test('Rate limit enforced', async ({ request }) => {
  const token = '<valid_jwt>';
  
  // Send 70 requests
  const responses = await Promise.all(
    Array(70).fill(null).map(() =>
      request.post('https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {},
      })
    )
  );
  
  // First 60 should succeed
  const successCount = responses.filter(r => r.status() === 200).length;
  expect(successCount).toBeGreaterThanOrEqual(50); // Allow some concurrency variance
  
  // Some should be rate-limited
  const rateLimitedCount = responses.filter(r => r.status() === 429).length;
  expect(rateLimitedCount).toBeGreaterThan(0);
  
  // Check Retry-After header on 429 response
  const rateLimitedResponse = responses.find(r => r.status() === 429);
  const retryAfter = await rateLimitedResponse.headerValue('Retry-After');
  expect(retryAfter).toBeTruthy();
  expect(parseInt(retryAfter)).toBeGreaterThan(0);
});
```

---

## 📊 Test Checklist

### Pre-Release Testing

- [ ] Authentication: Invalid JWT rejected (Test 1.2)
- [ ] RLS: Cannot read other users' data (Test 2.1, 2.2)
- [ ] IDOR: Edge function validates user_id (Test 2.3)
- [ ] Input Validation: XSS payloads escaped (Test 3.2)
- [ ] Rate Limiting: 429 returned after threshold (Test 4.1)
- [ ] Security Headers: CSP, HSTS, X-Frame-Options present (Test 7.1)
- [ ] Secrets: Service role key not in client bundle (Test 8.1)

### Post-Deployment Verification

- [ ] HTTPS enforced (no HTTP access)
- [ ] Security headers present on production
- [ ] Rate limiting active in production
- [ ] Audit logs being written
- [ ] No console errors in production build

---

## 🔧 Tools

### Manual Testing
- **Browser DevTools**: Network tab, Console, Application (cookies)
- **curl**: Command-line HTTP requests
- **Postman**: API testing with collections
- **psql**: Direct database queries

### Automated Testing
- **Playwright**: End-to-end security tests
- **OWASP ZAP**: Dynamic application security testing (DAST)
- **Burp Suite**: Web vulnerability scanner
- **npm audit**: Dependency vulnerability scanning
- **gitleaks**: Secret scanning in git history

### Monitoring
- **Supabase Logs**: Edge function and database logs
- **Browser Extensions**: Wappalyzer, Security Headers checker

---

**Test Frequency:**
- Manual tests: Before every release
- Automated tests: CI/CD pipeline (every commit)
- Penetration tests: Quarterly

**Last Test Date:** 2025-10-23  
**Next Scheduled:** [To be determined]

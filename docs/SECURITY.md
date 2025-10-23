# NutriZen Security Configuration

## Environment Variables

### Required Server-Side Variables (.env.local or Edge Function Secrets)

```bash
# Supabase Configuration
SUPABASE_URL=https://pghdaozgxkbtsxwydemd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>  # NEVER expose to client!

# Application Configuration
APP_BASE_URL=https://your-app.com

# Optional: Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_WINDOW_MS=60000
```

### Client-Side Variables (next.config.js or .env)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://pghdaozgxkbtsxwydemd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Authentication & Authorization

### JWT Token Flow

1. **Client Login:**
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email,
     password
   });
   // Receives JWT token automatically
   ```

2. **Edge Function Verification:**
   ```typescript
   const authHeader = req.headers.get("Authorization");
   const token = authHeader.replace("Bearer ", "");
   const { data: { user }, error } = await supabase.auth.getUser(token);
   ```

3. **RLS Automatic Enforcement:**
   - All queries use `auth.uid()` in policies
   - Service role bypasses RLS (use carefully!)

---

## Row-Level Security (RLS) Policies

### Current Policies

#### preferences
```sql
-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences"
ON preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### user_weekly_menus
```sql
-- Users can manage their own menus
CREATE POLICY "Users can manage their own menus"
ON user_weekly_menus FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### user_dashboard_stats
```sql
-- Users can view/update their own stats
CREATE POLICY "Users can view their own stats"
ON user_dashboard_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON user_dashboard_stats FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role can manage all stats"
ON user_dashboard_stats FOR ALL
USING (auth.role() = 'service_role');
```

#### user_gamification
```sql
-- Similar to user_dashboard_stats
CREATE POLICY "Users can view own gamification"
ON user_gamification FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
ON user_gamification FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage gamification"
ON user_gamification FOR ALL
USING (auth.role() = 'service_role');
```

#### recipes
```sql
-- Public read access for published recipes
CREATE POLICY "Anyone can view published recipes"
ON recipes FOR SELECT
USING (published = true);

-- Only admins can modify
CREATE POLICY "Admins can manage recipes"
ON recipes FOR ALL
USING (has_role(auth.uid(), 'admin'));
```

---

## Storage Security

### Recipe Images Bucket

**Option 1: Public Bucket (Recommended for Simplicity)**
```sql
-- Bucket is public, anyone can read
-- Only service role and admins can write
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

CREATE POLICY "Service role can manage"
ON storage.objects FOR ALL
USING (bucket_id = 'recipe-images' AND auth.role() = 'service_role');
```

**Option 2: Private Bucket with Signed URLs**
```sql
-- Only authenticated users can read
CREATE POLICY "Authenticated users can view"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recipe-images' 
  AND auth.role() = 'authenticated'
);

-- Generate signed URLs in edge functions:
const { data } = await supabase.storage
  .from('recipe-images')
  .createSignedUrl(imagePath, 604800); // 7 days
```

---

## Input Validation

### Always Use Zod Schemas

```typescript
import { z } from 'zod';

const GenerateMenuSchema = z.object({
  user_id: z.string().uuid().optional(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// In edge function
const validatedInput = GenerateMenuSchema.parse(body);
```

### Sanitize User Inputs

```typescript
// Never trust user input for SQL queries
// Use parameterized queries or Supabase client methods
// ❌ BAD
const { data } = await supabase.rpc('raw_query', { 
  query: `SELECT * FROM recipes WHERE title = '${userInput}'` 
});

// ✅ GOOD
const { data } = await supabase
  .from('recipes')
  .select('*')
  .eq('title', userInput);
```

---

## Rate Limiting

### Edge Function Rate Limiting (Recommended)

```typescript
// Use Supabase Edge Function rate limiting
// Configure in supabase/config.toml

[functions.generate-menu]
verify_jwt = true
import_map = "./import_map.json"

# Add rate limiting middleware
# Example: 60 requests per minute per user
```

### Client-Side Debouncing

```typescript
import { debounce } from 'lodash';

const regenerateMenu = debounce(async () => {
  await supabase.functions.invoke('generate-menu');
}, 2000); // 2 second debounce
```

---

## CORS Configuration

### Edge Functions CORS Headers

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // Or specific domain
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Always handle OPTIONS
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}
```

### Production CORS

```typescript
// In production, restrict to your domain
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://nutrizen.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

---

## Secrets Management

### Never Commit Secrets

```gitignore
# .gitignore
.env
.env.local
.env.production
supabase/.env
```

### Use Supabase Secrets Manager

```bash
# Set secrets via Supabase CLI or Dashboard
supabase secrets set SOME_API_KEY=value

# Access in edge functions
const apiKey = Deno.env.get("SOME_API_KEY");
```

### Service Role Key Protection

```typescript
// ❌ NEVER expose service role key to client
const client = createClient(url, serviceRoleKey); // DANGEROUS!

// ✅ ONLY use in server-side code
// Edge functions
// Server actions
// Backend API routes
```

---

## SQL Injection Prevention

### Use Supabase Client Methods (Safe)

```typescript
// ✅ SAFE - Parameterized automatically
const { data } = await supabase
  .from('recipes')
  .select('*')
  .eq('title', userInput)
  .ilike('ingredients_text', `%${userInput}%`);
```

### Avoid Raw SQL with User Input

```typescript
// ❌ DANGEROUS
const { data } = await supabase.rpc('exec', {
  sql: `SELECT * FROM recipes WHERE title = '${userInput}'`
});

// ✅ SAFE - Use RPC with parameters
const { data } = await supabase.rpc('search_recipes', {
  search_term: userInput
});
```

---

## XSS Prevention

### React Auto-Escapes

```tsx
// ✅ SAFE - React escapes by default
<div>{userInput}</div>

// ❌ DANGEROUS
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SAFE - Use sanitization library if HTML needed
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userInput) 
}} />
```

---

## Logging Best Practices

### Don't Log Sensitive Data

```typescript
// ❌ BAD
console.log("User login:", email, password);
console.log("JWT:", token);

// ✅ GOOD
console.log(`[generate-menu] Processing request for user: ${user.id}`);
console.log("[init-user-rows] Successfully initialized rows");
```

### Use Structured Logging

```typescript
console.log(JSON.stringify({
  level: "info",
  function: "generate-menu",
  user_id: user.id,
  action: "menu_generated",
  fallback_level: 2,
  timestamp: new Date().toISOString()
}));
```

---

## Checklist: Production Security

- [ ] Service role key is NEVER in client code
- [ ] All user tables have RLS enabled
- [ ] RLS policies tested with different user roles
- [ ] Input validation with zod on all edge functions
- [ ] Rate limiting configured
- [ ] CORS restricted to production domain
- [ ] No secrets committed to git
- [ ] Storage bucket policies configured correctly
- [ ] SQL injection prevented (use client methods)
- [ ] XSS prevented (React auto-escape)
- [ ] No PII in logs
- [ ] JWT tokens verified on every edge function call
- [ ] HTTPS enforced in production
- [ ] Error messages don't leak internal details

---

## Security Incident Response

### If Service Role Key is Compromised

1. **Immediately rotate the key** in Supabase Dashboard
2. Update all edge function secrets
3. Review audit logs for suspicious activity
4. Check for unauthorized data access/modification

### If User Data is Accessed Illegally

1. Review RLS policies
2. Check edge function logs for unauthorized calls
3. Notify affected users (GDPR compliance)
4. Implement additional security measures

---

## Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Supabase Edge Functions Security](https://supabase.com/docs/guides/functions)

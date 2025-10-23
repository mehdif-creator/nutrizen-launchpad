# NutriZen Deployment Guide

**Version:** 1.0  
**Last Updated:** 2025-10-23

---

## Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase project configured
- Stripe account (for payments)
- Domain with HTTPS (required for production)

---

## Environment Variables

### Client-Side (Public)

```env
# .env
VITE_SUPABASE_PROJECT_ID=pghdaozgxkbtsxwydemd
VITE_SUPABASE_URL=https://pghdaozgxkbtsxwydemd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
VITE_APP_URL=https://mynutrizen.fr
VITE_APP_NAME=NutriZen
VITE_LOCALE=fr-FR
VITE_TIMEZONE=Europe/Paris
```

### Server-Side (Supabase Secrets)

```bash
# Set via Supabase dashboard or CLI
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
supabase secrets set N8N_WEBHOOK_BASE="https://..."
```

**CRITICAL:** Never commit service role key to git!

---

## Pre-Deployment Checklist

### 1. Security

- [ ] Run security scan: `npm run check:secrets`
- [ ] Review RLS policies in Supabase dashboard
- [ ] Rotate service role key if exposed
- [ ] Enable leaked password protection (Supabase Auth settings)
- [ ] Configure CORS origins in edge functions (remove `*`)
- [ ] Set up CSP with production domains only

### 2. Database

- [ ] Run all migrations: `supabase db push`
- [ ] Verify indexes created: `SELECT * FROM pg_indexes WHERE schemaname = 'public'`
- [ ] Test RLS policies with sample users
- [ ] Set up audit log cleanup cron job (optional)

### 3. Edge Functions

- [ ] Deploy all functions: `supabase functions deploy --project-ref pghdaozgxkbtsxwydemd`
- [ ] Verify function logs: Check Supabase dashboard
- [ ] Test rate limiting with >60 requests
- [ ] Verify JWT validation works

### 4. Frontend

- [ ] Build production bundle: `npm run build`
- [ ] Run secret check: `npm run check:secrets`
- [ ] Test security headers: `curl -I https://mynutrizen.fr`
- [ ] Verify CSP doesn't block legitimate resources

### 5. Testing

- [ ] Manual security tests (see `SECURITY_TESTS.md`)
- [ ] E2E tests: `npm run test` (if configured)
- [ ] Load testing on edge functions

---

## Deployment Steps

### Option 1: Lovable Deployment (Recommended)

Lovable automatically deploys on push to main branch.

1. **Push to main:**
   ```bash
   git push origin main
   ```

2. **Monitor build:**
   - Check Lovable dashboard for build status
   - Review logs for errors

3. **Verify deployment:**
   ```bash
   curl https://mynutrizen.fr
   curl -I https://mynutrizen.fr # Check headers
   ```

### Option 2: Manual Deployment

1. **Build:**
   ```bash
   npm ci
   npm run build
   ```

2. **Deploy edge functions:**
   ```bash
   supabase functions deploy --project-ref pghdaozgxkbtsxwydemd
   ```

3. **Deploy static files:**
   - Upload `dist/` to hosting provider (Netlify, Vercel, etc.)
   - Configure redirects for SPA routing

4. **Configure CDN:**
   - Set cache headers for static assets (1 year)
   - No cache for index.html

---

## Post-Deployment Verification

### 1. Smoke Tests

```bash
# Homepage loads
curl https://mynutrizen.fr

# API health check
curl https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu \
  -H "Authorization: Bearer <test_jwt>"

# Storage bucket accessible (signed URL)
curl <signed_url_from_edge_function>
```

### 2. Security Headers Check

```bash
curl -I https://mynutrizen.fr | grep -E "(Content-Security-Policy|Strict-Transport-Security|X-Frame-Options)"

# Expected:
# Content-Security-Policy: default-src 'self'; ...
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# X-Frame-Options: DENY
```

### 3. Authentication Flow

1. Sign up new user → verify email sent
2. Login → verify JWT stored (httpOnly cookie or localStorage)
3. Access protected route → verify redirect if not authenticated
4. Logout → verify session cleared

### 4. Rate Limiting

```bash
# Generate 100 requests
for i in {1..100}; do
  curl -X POST \
    -H "Authorization: Bearer <jwt>" \
    https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu \
    -w "\n%{http_code}\n"
done

# Expected: First 60 return 200, rest return 429
```

### 5. Audit Logs

```sql
-- Check audit logs are being written
SELECT COUNT(*) FROM public.audit_log
WHERE created_at > now() - interval '1 hour';

-- Should be > 0 if users active
```

---

## Rollback Procedure

### Database Migration Rollback

```bash
# List migrations
supabase db migration list

# Rollback last migration
supabase db reset --db-url <connection_string>

# Apply up to specific version
supabase db push --version <version>
```

### Edge Function Rollback

```bash
# Redeploy previous version from git
git checkout <previous_commit>
supabase functions deploy --project-ref pghdaozgxkbtsxwydemd
git checkout main
```

### Frontend Rollback

```bash
# Lovable: Rollback via dashboard
# Manual: Deploy previous version of dist/
```

---

## Monitoring Setup

### 1. Uptime Monitoring

**Recommended:** UptimeRobot, Better Uptime, Pingdom

**Endpoints to monitor:**
- `https://mynutrizen.fr` (homepage)
- `https://mynutrizen.fr/auth/login` (auth flow)
- `https://pghdaozgxkbtsxwydemd.supabase.co/rest/v1/` (database health)

### 2. Error Tracking

**Recommended:** Sentry, Rollbar

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  beforeSend(event) {
    // Filter PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
```

### 3. Log Aggregation

**Recommended:** Datadog, Logtail, Better Stack

```typescript
// Edge function logging
const logger = new Logtail(Deno.env.get('LOGTAIL_TOKEN'));
logger.info('Menu generated', { userId, duration_ms: 1234 });
```

### 4. Alerts

Configure alerts for:
- **Uptime < 99.9%** → Page on-call engineer
- **Error rate > 5%** → Slack notification
- **Rate limit exceeded > 100/hour** → Email notification
- **Failed auth attempts > 50/hour** → Security alert

---

## Performance Optimization

### 1. Database

- Ensure all indexes created (see migration files)
- Enable query caching in Supabase dashboard
- Monitor slow queries: `SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC;`

### 2. Edge Functions

- Use connection pooling (default in Supabase)
- Cache frequent queries (Redis optional)
- Optimize rate limit queries (already indexed)

### 3. Frontend

- Code splitting (Vite default)
- Image optimization (use Next Image or similar)
- CDN for static assets
- Service worker for offline support

### 4. CDN Configuration

```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# No cache for HTML
location ~* \.html$ {
  expires -1;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

---

## Scaling Considerations

### Database

- **Current:** Supabase Free/Pro tier
- **Scale to:** Dedicated instance at 10K+ users
- **Monitoring:** Connection count, query time, storage usage

### Edge Functions

- **Current:** Supabase Deno functions (auto-scaling)
- **Scale to:** No action needed (serverless auto-scales)
- **Monitoring:** Invocation count, error rate, cold start time

### Storage

- **Current:** Supabase Storage
- **Scale to:** CDN in front (Cloudflare R2, AWS S3 + CloudFront)
- **Monitoring:** Bandwidth usage, request count

---

## Backup & Disaster Recovery

### Database Backups

- **Automatic:** Supabase provides daily backups (7-day retention on Pro plan)
- **Manual:** 
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
  ```
- **Restore:**
  ```bash
  psql $DATABASE_URL < backup_20250123.sql
  ```

### Storage Backups

- **Recipe images:** Sync to external S3 bucket weekly
- **User uploads:** No backup needed (can be regenerated)

### Disaster Recovery Plan

1. **Database failure:**
   - Restore from latest Supabase backup (<5 min)
   - Or restore from manual backup (<30 min)

2. **Edge function failure:**
   - Redeploy from git (<5 min)
   - Rollback to previous version if needed

3. **Complete outage:**
   - Migrate to new Supabase project (<4 hours)
   - Update DNS and environment variables
   - Verify all functionality

---

## Compliance & Certifications

### GDPR Compliance

- [ ] Privacy policy published
- [ ] Cookie banner implemented
- [ ] User data export function
- [ ] User data deletion function
- [ ] Data processing agreement with Supabase

### HIPAA (if applicable)

- [ ] BAA signed with Supabase
- [ ] Audit logs enabled
- [ ] Encryption at rest verified
- [ ] Access controls documented

---

## Troubleshooting

### Issue: 500 Error on Edge Function

**Symptoms:** Edge function returns 500, logs show "Database connection failed"

**Solution:**
1. Check Supabase status page
2. Verify service role key in secrets
3. Review edge function logs for details
4. Check RLS policies allow service role access

### Issue: Rate Limit Not Working

**Symptoms:** Users can exceed 60 requests/min

**Solution:**
1. Verify `rate_limits` table exists
2. Check `check_rate_limit()` function deployed
3. Confirm edge functions call rate limit check
4. Review logs for rate limit errors

### Issue: Security Headers Missing

**Symptoms:** `curl -I` doesn't show CSP headers

**Solution:**
1. Verify `vite-security-plugin.ts` imported in `vite.config.ts`
2. Check hosting provider allows custom headers
3. Add headers via `_headers` file (Netlify) or `vercel.json`

---

## Maintenance Windows

**Recommended schedule:**
- **Database migrations:** Sunday 2-4 AM UTC (low traffic)
- **Edge function updates:** Anytime (zero downtime)
- **Frontend deploys:** Anytime (zero downtime)

**Notification:**
- Post maintenance notice 24h in advance
- Update status page during maintenance
- Send email to users if downtime > 5 minutes

---

## Support Contacts

- **Supabase Support:** https://supabase.com/dashboard/support
- **Lovable Support:** support@lovable.app
- **Stripe Support:** https://support.stripe.com/
- **On-Call Engineer:** [Your contact info]

---

**Maintained by:** DevOps Team  
**Last Updated:** 2025-10-23  
**Next Review:** 2026-01-23

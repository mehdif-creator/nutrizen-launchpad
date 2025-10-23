# NutriZen Security Incident Response Playbook

**Version:** 1.0  
**Last Updated:** 2025-10-23

---

## Purpose

This playbook provides step-by-step procedures for responding to security incidents affecting NutriZen. Follow these procedures to minimize damage, preserve evidence, and restore normal operations.

---

## Incident Classification

### Severity Levels

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| **P0 - Critical** | Active breach, data exposed | Service role key leaked, database dump public | **< 15 minutes** |
| **P1 - High** | Potential breach, service disruption | Suspicious admin activity, API abuse | **< 1 hour** |
| **P2 - Medium** | Security weakness exploited | IDOR bypass, rate limit circumvention | **< 4 hours** |
| **P3 - Low** | Minor security issue | Outdated dependency, informational leak | **< 24 hours** |

---

## 🚨 Incident Response Procedures

### STEP 1: Detect & Assess (0-5 minutes)

**Detection Sources:**
- Supabase edge function error logs
- Audit log anomalies
- User reports
- Security scan alerts (GitHub Actions, Dependabot)
- Monitoring alerts (uptime, error rate)

**Initial Assessment:**
1. **What happened?** Identify the incident type (see classifications below)
2. **When?** Determine incident start time from logs
3. **Who?** Identify affected users/systems
4. **Severity?** Classify using table above

**Log Review:**
```sql
-- Check recent audit logs for suspicious activity
SELECT * FROM public.audit_log
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;

-- Check failed authentication attempts
SELECT COUNT(*), user_id, ip_address
FROM auth_logs
WHERE event = 'failed_login'
  AND timestamp > now() - interval '1 hour'
GROUP BY user_id, ip_address
HAVING COUNT(*) > 10;
```

---

### STEP 2: Contain (5-30 minutes)

**Immediate Actions Based on Incident Type:**

#### A. Compromised Service Role Key (P0)
```bash
# 1. Rotate Supabase Service Role Key
# Go to: https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/settings/api
# Click "Reset" on Service Role Key

# 2. Update all edge function secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<new_key>"

# 3. Revoke compromised key (contact Supabase support)

# 4. Review audit logs for unauthorized access
SELECT * FROM public.audit_log
WHERE created_at > '<incident_start_time>'
  AND user_id NOT IN (SELECT id FROM user_roles WHERE role = 'admin');
```

#### B. User Account Compromise (P1)
```sql
-- 1. Lock affected user account
UPDATE auth.users
SET banned_until = now() + interval '24 hours'
WHERE id = '<compromised_user_id>';

-- 2. Invalidate all sessions
DELETE FROM auth.sessions WHERE user_id = '<compromised_user_id>';

-- 3. Review recent activity
SELECT * FROM public.audit_log
WHERE user_id = '<compromised_user_id>'
  AND created_at > '<incident_start_time>';

-- 4. Check for data exfiltration
SELECT table_name, operation, COUNT(*)
FROM public.audit_log
WHERE user_id = '<compromised_user_id>'
  AND operation = 'SELECT'
  AND created_at > '<incident_start_time>'
GROUP BY table_name, operation;
```

#### C. IDOR / RLS Bypass (P1)
```sql
-- 1. Verify RLS is enabled on affected table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = '<affected_table>';

-- 2. Disable public access temporarily
REVOKE ALL ON TABLE public.<affected_table> FROM anon, authenticated;

-- 3. Review RLS policies
SELECT * FROM pg_policies
WHERE tablename = '<affected_table>';

-- 4. Check for unauthorized access
SELECT * FROM public.audit_log
WHERE table_name = '<affected_table>'
  AND created_at > '<incident_start_time>'
ORDER BY created_at DESC;
```

#### D. DDoS / Rate Limit Bypass (P2)
```sql
-- 1. Identify attacker IPs/users
SELECT identifier, endpoint, COUNT(*) as request_count
FROM public.rate_limits
WHERE last_refill > now() - interval '5 minutes'
GROUP BY identifier, endpoint
HAVING COUNT(*) > 100
ORDER BY request_count DESC;

-- 2. Block IPs at edge function level
-- Add to blocklist in supabase/config.toml or edge function code

-- 3. Reduce rate limits temporarily
-- Update DEFAULT_RATE_LIMIT in _shared/security.ts

-- 4. Enable Cloudflare/WAF if available
```

#### E. SQL Injection Attempt (P1)
```sql
-- 1. Review edge function logs for suspicious queries
-- Check Supabase dashboard: Edge Functions > Logs

-- 2. Verify parameterized queries are used
-- Review edge function code for raw SQL

-- 3. Check database logs for unusual queries
SELECT * FROM pg_stat_statements
WHERE query LIKE '%UNION%' OR query LIKE '%DROP%'
ORDER BY calls DESC;

-- 4. If injection succeeded, assess damage
SELECT * FROM public.audit_log
WHERE created_at > '<incident_start_time>'
  AND operation IN ('UPDATE', 'DELETE');
```

---

### STEP 3: Eradicate (30 minutes - 2 hours)

**Root Cause Analysis:**
1. Identify vulnerability exploited
2. Review affected code/configuration
3. Develop and test fix
4. Deploy patch

**Common Fixes:**
- **Missing RLS Policy**: Add policy with `CREATE POLICY ... USING (auth.uid() = user_id)`
- **Weak Validation**: Add Zod schema in `_shared/validation.ts`
- **Rate Limit Bypass**: Lower limits, add endpoint-specific rules
- **Exposed Secrets**: Rotate immediately, audit usage

**Deployment:**
```bash
# 1. Create hotfix branch
git checkout -b hotfix/security-patch

# 2. Implement fix
# [Make changes]

# 3. Deploy to production
git push origin hotfix/security-patch
# Automatic deployment via Lovable CI

# 4. Verify fix
# [Test exploit no longer works]
```

---

### STEP 4: Recover (2-4 hours)

**Data Restoration (if needed):**
```sql
-- 1. Check if data was deleted/modified
SELECT * FROM public.audit_log
WHERE operation IN ('UPDATE', 'DELETE')
  AND created_at BETWEEN '<incident_start>' AND '<incident_end>';

-- 2. Restore from before_data in audit log
-- Example: Restore deleted preference
INSERT INTO public.preferences (user_id, allergies, ...)
SELECT 
  (before_data->>'user_id')::uuid,
  (before_data->'allergies')::text[],
  ...
FROM public.audit_log
WHERE table_name = 'preferences'
  AND operation = 'DELETE'
  AND row_id = '<deleted_row_id>';

-- 3. If audit log insufficient, restore from Supabase backup
-- Contact Supabase support for point-in-time recovery
```

**Service Restoration:**
1. Lift temporary access restrictions
2. Unlock affected user accounts
3. Re-enable disabled features
4. Verify full functionality

**User Communication:**
```markdown
Subject: Security Incident Notification

Dear NutriZen User,

On [DATE] at [TIME], we detected and resolved a security incident
affecting [SCOPE]. 

What happened:
[BRIEF DESCRIPTION]

What we did:
- Immediately contained the incident
- Fixed the vulnerability
- Reviewed all affected data

What you should do:
- [ACTION ITEMS, e.g., "Change your password"]

We take security seriously and apologize for any inconvenience.

NutriZen Security Team
```

---

### STEP 5: Post-Incident Review (24-48 hours)

**Required Documentation:**
1. Incident timeline (detection → resolution)
2. Root cause analysis
3. Data impact assessment
4. Actions taken
5. Lessons learned
6. Preventive measures

**Post-Mortem Template:**
```markdown
# Incident Post-Mortem: [TITLE]

**Date:** [DATE]
**Severity:** [P0/P1/P2/P3]
**Duration:** [TIME]
**Status:** Resolved

## Summary
[Brief description]

## Timeline
- HH:MM - Incident detected via [source]
- HH:MM - Severity assessed as [level]
- HH:MM - Containment actions started
- HH:MM - Vulnerability patched
- HH:MM - Services restored
- HH:MM - Incident resolved

## Root Cause
[Technical analysis]

## Impact
- Users affected: [NUMBER/NONE]
- Data exposed: [YES/NO]
- Downtime: [DURATION]

## What Went Well
- [Positive aspects]

## What Went Wrong
- [Areas for improvement]

## Action Items
1. [ ] [Preventive measure 1]
2. [ ] [Preventive measure 2]

## Follow-up
- Review Date: [DATE]
- Responsible: [NAME]
```

---

## 🔐 Preventive Maintenance

### Weekly Checks
- [ ] Review audit logs for anomalies
- [ ] Check rate limit violations
- [ ] Monitor failed authentication attempts
- [ ] Review edge function error rates

### Monthly Checks
- [ ] Dependency updates (`npm audit`, `npm update`)
- [ ] Review and prune audit logs (>90 days)
- [ ] Test backup restoration
- [ ] Review RLS policies for new tables

### Quarterly Checks
- [ ] Rotate service role key
- [ ] Security scan (OWASP ZAP, Burp Suite)
- [ ] Review and update security documentation
- [ ] Penetration testing (external)

---

## 📞 Emergency Contacts

### Internal
- **Lead Developer**: [NAME/EMAIL]
- **DevOps**: [NAME/EMAIL]
- **On-Call**: [ROTATION SCHEDULE]

### External
- **Supabase Support**: https://supabase.com/dashboard/support
- **Stripe Support**: https://support.stripe.com/
- **Cloudflare Support** (if applicable): https://support.cloudflare.com/

### Security Researchers
- **Email**: security@nutrizen.app (to be created)
- **HackerOne** (if available): https://hackerone.com/nutrizen

---

## 🛠️ Tools & Resources

### Log Analysis
```bash
# Supabase logs CLI
supabase functions logs <function_name> --follow

# Database audit logs
psql $DATABASE_URL -c "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100"
```

### Security Scanning
```bash
# Dependency vulnerabilities
npm audit --audit-level=high

# Secret scanning
gitleaks detect --source . --verbose

# OWASP ZAP baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://mynutrizen.fr
```

### Monitoring
- **Supabase Dashboard**: https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd
- **Edge Function Logs**: https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/functions
- **Auth Logs**: https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/auth/users

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [NutriZen Security Report](./SECURITY_REPORT.md)
- [NutriZen Security Tests](./SECURITY_TESTS.md)

---

**Last Review:** 2025-10-23  
**Next Review:** 2026-01-23

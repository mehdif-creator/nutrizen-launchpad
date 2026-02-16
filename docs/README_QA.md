# NutriZen — QA Runbook

## Overview
This document describes the Quality Gate system for NutriZen, covering automated tests, admin health checks, and data integrity verification.

---

## 1. Running Unit Tests

```bash
# Run all unit tests
bun run test

# Run specific test file
bun run test src/lib/__tests__/mealKeys.test.ts
bun run test src/lib/__tests__/portions.test.ts
```

### Expected PASS Criteria
- `mealKeys.test.ts`: All French/English meal type normalizations resolve correctly
- `portions.test.ts`: Household factor, scaling, formatting all behave as specified

---

## 2. Admin Health Check Page

**Route:** `/admin/health` (admin-only access)

### Available Checks
| Check | What it validates |
|-------|-------------------|
| Supabase Connection | Can read `profiles` and `recipes` tables |
| Safety Gate | No menus contain restricted ingredients (allergy/avoid overlap) |
| Credit Consistency | Wallet balances match ledger, no negatives, no duplicate idempotency keys |
| Stuck Jobs | No menu generation or automation jobs stuck > 15 minutes |
| Images Integrity | All published recipes with `image_path` have valid `image_url` |
| Stripe Config | `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set |
| Realtime Tables | Key tables (`user_wallets`, `user_weekly_menu_items`, etc.) are accessible |
| Menu Pipeline | Recent menu generation jobs are not all failing |
| Active Alerts | No critical/error system alerts |

### How to Use
1. Navigate to `/admin/health`
2. Click "Lancer tous les checks"
3. Review PASS/FAIL/WARN for each panel
4. Expand any panel for details

---

## 3. SQL Integrity Checks

### Safety Violations View
```sql
-- Should always return 0 rows in production
SELECT * FROM public.v_menu_safety_violations LIMIT 10;
```

### Credit Consistency
```sql
SELECT public.check_credit_consistency();
-- Expected: {"is_consistent": true, ...}
```

### Stuck Jobs
```sql
SELECT public.check_stuck_jobs(15);
-- Expected: {"has_stuck_jobs": false, ...}
```

### Images Integrity
```sql
SELECT public.check_images_integrity();
-- Expected: {"is_clean": true, ...}
```

---

## 4. System Alerts

Alerts are stored in `public.system_alerts`. Active (unresolved) alerts are shown on the health page.

```sql
-- View active alerts
SELECT * FROM public.get_active_alerts();

-- Resolve an alert
UPDATE public.system_alerts SET resolved_at = now(), resolved_by = '<admin-uuid>' WHERE id = '<alert-id>';
```

---

## 5. Required Environment Variables

| Variable | Location | Required For |
|----------|----------|-------------|
| `SUPABASE_URL` | Edge Functions (auto) | All checks |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (auto) | Admin operations |
| `STRIPE_SECRET_KEY` | Supabase Secrets | Stripe check |
| `STRIPE_WEBHOOK_SECRET` | Supabase Secrets | Webhook verification |

---

## 6. Troubleshooting

### Where logs live
- **Edge Function logs**: Supabase Dashboard → Functions → `health-check` → Logs
- **Health check history**: `public.health_checks` table
- **System alerts**: `public.system_alerts` table
- **Menu job errors**: `public.menu_generation_jobs` (check `error` column)
- **Credit transactions**: `public.credit_transactions` (audit trail)

### Common Issues
| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Safety gate FAIL | Recipe with restricted ingredient in menu | Check `v_menu_safety_violations`, fix recipe tags or regenerate menu |
| Credit FAIL: negative balance | Bug in credit consumption | Check `user_wallets` for affected users, investigate `credit_transactions` |
| Stuck jobs WARN | Edge function timeout or n8n failure | Check job `error` column, retry or cancel stuck jobs |
| Images WARN | Missing `image_url` backfill | Run image URL backfill script |
| Stripe FAIL | Missing secrets | Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Supabase secrets |

---

## 7. Definition of Done

- ✅ All unit tests pass
- ✅ Admin health page shows PASS for all core panels
- ✅ Safety violations query returns 0 rows
- ✅ Credits change immediately after paid actions
- ✅ Dashboard updates after every action without refresh
- ✅ No critical system alerts active

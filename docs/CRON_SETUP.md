# NutriZen - Cron Job Setup for Credit Resets

## Setup Instructions

The hourly credit reset cron job needs to be configured manually in the Supabase Dashboard.

### Step 1: Enable Extensions (Already Done)

The following extensions have been enabled:
- `pg_cron` - Job scheduler for PostgreSQL
- `pg_net` - Async HTTP client

### Step 2: Create the Scheduled Job

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the following SQL:

```sql
SELECT cron.schedule(
  'hourly-credit-resets',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/run-credit-resets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{"trigger": "cron_hourly"}'::jsonb
    ) AS request_id;
  $$
);
```

**Alternative (if service_role_key not available in settings):**

```sql
SELECT cron.schedule(
  'hourly-credit-resets',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/run-credit-resets',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"trigger": "cron_hourly"}'::jsonb
    ) AS request_id;
  $$
);
```

Note: The Edge Function `run-credit-resets` has `verify_jwt = false` so it can be called without auth for cron jobs.

### Step 3: Verify the Job

```sql
SELECT * FROM cron.job WHERE jobname = 'hourly-credit-resets';
```

### Step 4: View Job History

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'hourly-credit-resets')
ORDER BY start_time DESC 
LIMIT 10;
```

### Manual Trigger (for testing)

You can manually trigger the credit reset function:

```bash
curl -X POST \
  'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/run-credit-resets' \
  -H 'Content-Type: application/json' \
  -d '{"trigger": "manual", "dry_run": true}'
```

### Monitoring

Check the `credit_reset_runs` table for execution logs:

```sql
SELECT * FROM credit_reset_runs 
ORDER BY started_at DESC 
LIMIT 20;
```

## Fallback Mechanism

In addition to the cron job, the application has a client-side fallback that checks for due credit resets on authenticated page loads. This ensures resets happen even if the cron job fails.

See: `src/hooks/useCreditsReset.ts`

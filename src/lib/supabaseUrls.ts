/**
 * Centralized Supabase URL helpers.
 * All Supabase-derived URLs must be built through these helpers —
 * never hardcode project IDs or "supabase.co" in component code.
 */

function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    throw new Error(
      'VITE_SUPABASE_URL is not set. Add it to your .env file.'
    );
  }
  return url.replace(/\/+$/, ''); // strip trailing slash
}

/** Public storage URL root, e.g. https://xxx.supabase.co/storage/v1/object/public */
export function storagePublicBaseUrl(): string {
  return `${getSupabaseUrl()}/storage/v1/object/public`;
}

/** Edge Functions URL root, e.g. https://xxx.supabase.co/functions/v1 */
export function functionsBaseUrl(): string {
  return `${getSupabaseUrl()}/functions/v1`;
}

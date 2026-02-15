/**
 * Shared dependency re-exports for all Edge Functions.
 * Every function MUST import createClient from this file — never directly
 * from esm.sh or npm.  This guarantees a single pinned version.
 */
export { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

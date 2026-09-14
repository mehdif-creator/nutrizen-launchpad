/**
 * Native startup decision, computed from Supabase only (single shared computation,
 * see `src/contexts/NativeStartupContext.tsx`):
 *
 * | session | onboarding  | plan        | destination |
 * |---------|-------------|-------------|-------------|
 * | no      | -           | -           | auth (welcome / login / signup) |
 * | yes     | incomplete  | -           | onboarding  |
 * | yes     | complete    | none        | paywall     |
 * | yes     | complete    | active      | dashboard   |
 * | yes     | read failed | -           | error (retry screen, no bypass) |
 *
 * Supabase fields: `profiles.onboarding_completed_at` / `profiles.onboarding_step`
 * (onboarding) and `subscriptions.status` / `profiles.plan_tier` /
 * `profiles.plan_selection` (plan).
 */
import { useNativeStartup, type NativeStartupDestination } from '@/contexts/NativeStartupContext';

export type { NativeStartupDestination };

export function useNativeStartupRoute(): NativeStartupDestination {
  return useNativeStartup().destination;
}

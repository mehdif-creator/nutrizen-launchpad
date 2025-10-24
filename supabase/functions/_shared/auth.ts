/**
 * Shared authentication and authorization helpers for Edge Functions
 * Server-side admin verification and role checking
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { SecurityError } from './security.ts';

/**
 * Verify if a user has admin role
 * Must be called server-side to prevent client-side bypass
 * 
 * @throws SecurityError if user is not admin or check fails
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  if (!userId) {
    throw new SecurityError(
      'Authentication required',
      'AUTH_REQUIRED',
      401
    );
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (error) {
      console.error('[requireAdmin] Database error:', error);
      throw new SecurityError(
        'Authorization check failed',
        'AUTH_CHECK_ERROR',
        500
      );
    }

    if (!data) {
      throw new SecurityError(
        'Admin access required',
        'FORBIDDEN',
        403
      );
    }
  } catch (err) {
    if (err instanceof SecurityError) throw err;
    
    console.error('[requireAdmin] Unexpected error:', err);
    throw new SecurityError(
      'Authorization check failed',
      'AUTH_CHECK_ERROR',
      500
    );
  }
}

/**
 * Check if a user has a specific role
 * 
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(
  supabase: SupabaseClient,
  userId: string,
  role: 'admin' | 'moderator' | 'user'
): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', role)
      .maybeSingle();
    
    if (error) {
      console.error('[hasRole] Database error:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('[hasRole] Unexpected error:', err);
    return false;
  }
}

/**
 * Get all roles for a user
 * 
 * @returns Array of role names
 */
export async function getUserRoles(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      console.error('[getUserRoles] Database error:', error);
      return [];
    }

    return data?.map(r => r.role) || [];
  } catch (err) {
    console.error('[getUserRoles] Unexpected error:', err);
    return [];
  }
}

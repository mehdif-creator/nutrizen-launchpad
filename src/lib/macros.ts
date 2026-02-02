/**
 * Data Access Layer for Recipe Macros
 * 
 * Uses cursor-based pagination and RPC calls for optimal performance.
 * No OFFSET queries - all pagination is cursor-based on recipe_id.
 */

import { supabase } from '@/integrations/supabase/client';

// Types for macro data
export interface RecipeMacro {
  recipe_id: string;
  recipe_title?: string;
  calories_kcal: number | null;
  proteins_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  fibers_g: number | null;
}

export interface MacrosCoverage {
  total_store: number;
  with_macros: number;
  coverage_percent: number;
}

export interface MacrosPageResult {
  data: RecipeMacro[];
  hasMore: boolean;
  lastRecipeId: string | null;
}

/**
 * Fetch a page of recipe macros using cursor-based pagination
 * Uses RPC get_recipe_macros_page if available, otherwise falls back to direct query
 */
export async function fetchRecipeMacrosPage(
  lastRecipeId: string | null,
  limit: number = 25
): Promise<MacrosPageResult> {
  try {
    // Try RPC first (preferred, cursor-based)
    const { data, error } = await supabase.rpc('get_recipe_macros_page', {
      p_last_recipe_id: lastRecipeId,
      p_limit: limit + 1, // Request one extra to detect hasMore
    });

    if (error) {
      console.warn('RPC get_recipe_macros_page failed, falling back to direct query:', error);
      return fetchRecipeMacrosPageFallback(lastRecipeId, limit);
    }

    const items = (data as RecipeMacro[]) || [];
    const hasMore = items.length > limit;
    const pageData = hasMore ? items.slice(0, limit) : items;
    const lastId = pageData.length > 0 ? pageData[pageData.length - 1].recipe_id : null;

    return {
      data: pageData,
      hasMore,
      lastRecipeId: lastId,
    };
  } catch (err) {
    console.error('Error in fetchRecipeMacrosPage:', err);
    return fetchRecipeMacrosPageFallback(lastRecipeId, limit);
  }
}

/**
 * Fallback: Direct query to recipe_macros_mv2 with cursor pagination
 */
async function fetchRecipeMacrosPageFallback(
  lastRecipeId: string | null,
  limit: number
): Promise<MacrosPageResult> {
  let query = supabase
    .from('recipe_macros_mv2')
    .select('recipe_id, calories_kcal, proteins_g, carbs_g, fats_g, fibers_g')
    .order('recipe_id', { ascending: true })
    .limit(limit + 1);

  if (lastRecipeId) {
    query = query.gt('recipe_id', lastRecipeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch macros: ${error.message}`);
  }

  const items = data || [];
  const hasMore = items.length > limit;
  const pageData = hasMore ? items.slice(0, limit) : items;
  const lastId = pageData.length > 0 ? pageData[pageData.length - 1].recipe_id : null;

  return {
    data: pageData as RecipeMacro[],
    hasMore,
    lastRecipeId: lastId,
  };
}

/**
 * Fetch macros coverage statistics from the store
 */
export async function fetchMacrosCoverage(): Promise<MacrosCoverage> {
  // Get total count
  const { count: total, error: totalError } = await supabase
    .from('recipe_macros_store')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    throw new Error(`Failed to fetch total count: ${totalError.message}`);
  }

  // Get count with macros (where calories_kcal is not null)
  const { count: withMacros, error: withMacrosError } = await supabase
    .from('recipe_macros_store')
    .select('*', { count: 'exact', head: true })
    .not('calories_kcal', 'is', null);

  if (withMacrosError) {
    throw new Error(`Failed to fetch with_macros count: ${withMacrosError.message}`);
  }

  const totalStore = total || 0;
  const macrosCount = withMacros || 0;
  const coveragePercent = totalStore > 0 ? (macrosCount / totalStore) * 100 : 0;

  return {
    total_store: totalStore,
    with_macros: macrosCount,
    coverage_percent: Math.round(coveragePercent * 100) / 100,
  };
}

/**
 * Fetch the pending count from the macros queue
 */
export async function fetchMacrosQueueCount(): Promise<number> {
  const { count, error } = await supabase
    .from('recipe_macros_queue')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to fetch queue count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Admin: Process the macros queue (calls RPC)
 * Requires admin role
 */
export async function adminProcessQueue(limit: number = 200): Promise<number> {
  const { data, error } = await supabase.rpc('process_recipe_macros_queue', {
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to process queue: ${error.message}`);
  }

  return data as number;
}

/**
 * Admin: Process queue in batches until empty or max iterations
 */
export async function adminProcessQueueBatch(
  batchSize: number = 200,
  maxIterations: number = 5,
  delayMs: number = 1000
): Promise<{ totalProcessed: number; iterations: number }> {
  let totalProcessed = 0;
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    const processed = await adminProcessQueue(batchSize);
    totalProcessed += processed;
    iterations++;

    if (processed === 0) {
      break;
    }

    // Rate limiting delay between batches
    if (i < maxIterations - 1 && processed > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { totalProcessed, iterations };
}

/**
 * Admin: Refresh the materialized view (calls Edge Function)
 * Requires admin role
 */
export async function adminRefreshMV2(): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('admin-refresh-macros-mv', {
    method: 'POST',
  });

  if (error) {
    throw new Error(`Failed to refresh MV2: ${error.message}`);
  }

  return data as { success: boolean; message: string };
}

/**
 * Get single recipe macros from store (for detail views)
 */
export async function fetchRecipeMacros(recipeId: string): Promise<RecipeMacro | null> {
  const { data, error } = await supabase
    .from('recipe_macros_mv2')
    .select('recipe_id, calories_kcal, proteins_g, carbs_g, fats_g, fibers_g')
    .eq('recipe_id', recipeId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching recipe macros:', error);
    return null;
  }

  return data as RecipeMacro | null;
}

/**
 * Format macro value for display
 */
export function formatMacroValue(value: number | null, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return value.toFixed(decimals);
}

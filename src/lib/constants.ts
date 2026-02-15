/**
 * Application-wide constants
 * Centralized location for all constant values used across the app
 */

/**
 * Default values for user stats
 */
export const DEFAULT_STATS = {
  temps_gagne: 0,
  charge_mentale_pct: 0,
  serie_en_cours_set_count: 0,
  credits_zen: 50, // New default: 50 credits per month with Équilibre plan
  references_count: 0,
  objectif_hebdos_valide: 0,
} as const;

/**
 * Default values for gamification
 */
export const DEFAULT_GAMIFICATION = {
  points: 0,
  level: 0,
  streak_days: 0,
  badges_count: 0,
} as const;

/**
 * Days of the week in French (Monday-Sunday)
 */
export const DAYS_OF_WEEK = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;

/**
 * Locale configuration
 */
export const LOCALE = 'fr-FR';
export const TIMEZONE = 'Europe/Paris';

/**
 * Query cache times (milliseconds)
 */
export const CACHE_TIME = {
  STATS: 5 * 60 * 1000, // 5 minutes
  MENU: 5 * 60 * 1000, // 5 minutes
  RECIPES: 10 * 60 * 1000, // 10 minutes
} as const;

/**
 * Image fallback paths
 */
export const IMAGE_FALLBACK = {
  RECIPE: '/img/hero-default.png',
  AVATAR: '/img/avatar-default.png',
} as const;

/**
 * Level thresholds for gamification
 */
export const LEVEL_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 50,
  GOLD: 150,
  PLATINUM: 300,
} as const;

/**
 * Zen points calculation
 */
export const ZEN_POINTS_PER_MINUTE = 0.1; // 10 minutes = 1 zen point

/**
 * API routes — edge function names only.
 * Build full URLs via supabase.functions.invoke() or functionsBaseUrl().
 */
export const EDGE_FUNCTIONS = {
  GENERATE_MENU: 'generate-menu',
  INIT_USER: 'init-user-rows',
  USE_SWAP: 'use-swap',
  HANDLE_REFERRAL: 'handle-referral',
} as const;

/**
 * Max retry attempts for failed operations
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Debounce delays (milliseconds)
 */
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  SAVE: 500,
} as const;

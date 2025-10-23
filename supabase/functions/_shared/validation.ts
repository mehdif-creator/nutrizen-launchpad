/**
 * Shared validation schemas using Zod
 * For input validation across edge functions
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =============================================================================
// USER SCHEMAS
// =============================================================================

export const UserIdSchema = z.string().uuid('Invalid user ID format');

export const EmailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .transform(email => email.toLowerCase().trim());

// =============================================================================
// MENU GENERATION SCHEMAS
// =============================================================================

export const GenerateMenuRequestSchema = z.object({
  user_id: UserIdSchema.optional(),
  week_start: z.string().optional(),
  force_regenerate: z.boolean().optional().default(false),
});

export type GenerateMenuRequest = z.infer<typeof GenerateMenuRequestSchema>;

// =============================================================================
// SWAP SCHEMAS
// =============================================================================

export const UseSwapRequestSchema = z.object({
  meal_plan_id: z.string().uuid('Invalid meal plan ID'),
  day: z.number()
    .int('Day must be an integer')
    .min(0, 'Day must be between 0 and 6')
    .max(6, 'Day must be between 0 and 6'),
});

export type UseSwapRequest = z.infer<typeof UseSwapRequestSchema>;

// =============================================================================
// PREFERENCES SCHEMAS
// =============================================================================

export const PreferencesUpdateSchema = z.object({
  user_id: UserIdSchema.optional(),
  objectifs: z.array(z.string()).optional(),
  budget: z.string().optional(),
  temps: z.string().optional(),
  personnes: z.number().int().min(1).max(20).optional(),
  allergies: z.array(z.string()).optional(),
  aliments_eviter: z.array(z.string()).optional(),
  cuisine_preferee: z.array(z.string()).optional(),
  appliances_owned: z.array(z.string()).optional(),
  type_alimentation: z.string().optional(),
  niveau_cuisine: z.string().optional(),
  // Health data
  age: z.number().int().min(1).max(150).optional(),
  sexe: z.enum(['homme', 'femme', 'autre']).optional(),
  taille_cm: z.number().int().min(50).max(300).optional(),
  poids_actuel_kg: z.number().min(20).max(500).optional(),
  poids_souhaite_kg: z.number().min(20).max(500).optional(),
});

export type PreferencesUpdate = z.infer<typeof PreferencesUpdateSchema>;

// =============================================================================
// CONTACT/LEAD SCHEMAS
// =============================================================================

export const ContactRequestSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .transform(s => s.trim()),
  email: EmailSchema,
  message: z.string()
    .min(1, 'Message is required')
    .max(2000, 'Message too long')
    .transform(s => s.trim()),
  subject: z.string()
    .max(200, 'Subject too long')
    .optional()
    .transform(s => s?.trim()),
});

export type ContactRequest = z.infer<typeof ContactRequestSchema>;

export const LeadMagnetRequestSchema = z.object({
  email: EmailSchema,
  source: z.string().max(50).optional(),
  utm_campaign: z.string().max(100).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
});

export type LeadMagnetRequest = z.infer<typeof LeadMagnetRequestSchema>;

// =============================================================================
// FOOD ANALYSIS SCHEMAS
// =============================================================================

export const AnalyzeMealRequestSchema = z.object({
  meal_name: z.string()
    .min(1, 'Meal name is required')
    .max(200, 'Meal name too long'),
  portion_size: z.string().optional(),
});

export type AnalyzeMealRequest = z.infer<typeof AnalyzeMealRequestSchema>;

export const AnalyzeFridgeRequestSchema = z.object({
  ingredients: z.array(z.string())
    .min(1, 'At least one ingredient required')
    .max(50, 'Too many ingredients'),
  preferences: z.object({
    cuisine_type: z.string().optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    cooking_time: z.string().optional(),
  }).optional(),
});

export type AnalyzeFridgeRequest = z.infer<typeof AnalyzeFridgeRequestSchema>;

// =============================================================================
// REFERRAL SCHEMAS
// =============================================================================

export const HandleReferralRequestSchema = z.object({
  referral_code: z.string()
    .min(1, 'Referral code is required')
    .max(50, 'Referral code too long')
    .regex(/^[a-z0-9-_]+$/i, 'Invalid referral code format'),
});

export type HandleReferralRequest = z.infer<typeof HandleReferralRequestSchema>;

// =============================================================================
// PAGINATION SCHEMAS
// =============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

// =============================================================================
// RECIPE SCHEMAS
// =============================================================================

export const RecipeFilterSchema = z.object({
  diet_type: z.string().optional(),
  max_prep_time: z.number().int().positive().optional(),
  max_calories: z.number().int().positive().optional(),
  allergens_exclude: z.array(z.string()).optional(),
  appliances: z.array(z.string()).optional(),
  cuisine_type: z.string().optional(),
  difficulty_level: z.enum(['facile', 'moyen', 'difficile']).optional(),
});

export type RecipeFilter = z.infer<typeof RecipeFilterSchema>;

// =============================================================================
// SUBSCRIPTION SCHEMAS
// =============================================================================

export const CreateCheckoutRequestSchema = z.object({
  price_id: z.string().min(1, 'Price ID is required'),
  email: EmailSchema,
  referral_code: z.string().optional(),
  plan: z.enum(['equilibre', 'premium', 'fit']).optional(),
});

export type CreateCheckoutRequest = z.infer<typeof CreateCheckoutRequestSchema>;

// =============================================================================
// VALIDATION HELPER
// =============================================================================

/**
 * Validate input with Zod schema and throw SecurityError on failure
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorCode = 'VALIDATION_ERROR'
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${messages}`);
    }
    throw error;
  }
}

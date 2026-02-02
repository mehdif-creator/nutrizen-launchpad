import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withSecurity, SecurityError } from '../_shared/security.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Input validation schema
const TrackReferralSchema = z.object({
  referralCode: z.string()
    .trim()
    .min(1, { message: 'Referral code is required' })
    .max(50, { message: 'Referral code too long' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid referral code format' }),
}).strict();

serve(async (req) => {
  return await withSecurity(req, {
    requireAuth: true,
    rateLimit: { maxTokens: 20, refillRate: 20, cost: 1 },
  }, async (context, body: unknown, logger) => {
    
    // Validate input with Zod
    const parseResult = TrackReferralSchema.safeParse(body);
    
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new SecurityError(`Validation failed: ${errorMessage}`, 'VALIDATION_ERROR', 400);
    }
    
    const { referralCode } = parseResult.data;
    
    logger.info('Processing referral signup', { 
      userId: context.userId, 
      referralCode 
    });
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Call the database function to handle referral
    const { data, error } = await supabase.rpc('handle_referral_signup', {
      p_referral_code: referralCode,
      p_new_user_id: context.userId,
    });
    
    if (error) {
      logger.error('Error handling referral', error);
      // Return sanitized error message
      throw new SecurityError(
        'Unable to process referral. Please try again.',
        'REFERRAL_ERROR',
        400
      );
    }
    
    logger.info('Referral processed successfully', { result: data });
    
    return {
      success: true,
      message: 'Parrainage enregistré avec succès',
      data
    };
  });
});

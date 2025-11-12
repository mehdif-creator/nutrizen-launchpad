import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withSecurity } from '../_shared/security.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

serve(async (req) => {
  return await withSecurity(req, {
    requireAuth: true,
    rateLimit: { maxTokens: 20, refillRate: 20, cost: 1 },
  }, async (context, body: { referralCode: string }, logger) => {
    
    const { referralCode } = body;
    
    if (!referralCode || typeof referralCode !== 'string') {
      throw new Error('Referral code is required');
    }
    
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
      throw new Error(`Failed to process referral: ${error.message}`);
    }
    
    logger.info('Referral processed', data);
    
    return data;
  });
});

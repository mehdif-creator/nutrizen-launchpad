import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ReferralTracking');

/**
 * Hook to track referral codes from URL parameters
 * Stores the referral code and processes it when user signs up
 */
export function useReferralTracking() {
  const location = useLocation();
  const { user } = useAuth();

  // Track referral code from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get('ref');

    if (refCode) {
      // Store referral code in localStorage
      localStorage.setItem('nutrizen_referral_code', refCode);
      logger.info('Code captured', { refCode });

      // Track click (anonymous, non-blocking)
      supabase.functions.invoke('referral-intake', {
        body: { 
          referralCode: refCode, 
          action: 'track_click',
        },
      }).catch(err => logger.debug('Click tracking error', { error: String(err) }));
    }
  }, [location]);

  // Process stored referral code when user signs up/logs in
  useEffect(() => {
    if (!user) return;

    const storedRefCode = localStorage.getItem('nutrizen_referral_code');
    const processedFlag = localStorage.getItem('nutrizen_referral_processed');

    if (storedRefCode && !processedFlag) {
      logger.info('Processing referral code for user', { refCode: storedRefCode });
      
      // Apply attribution via edge function
      const applyAttribution = async () => {
        try {
          const { data: session } = await supabase.auth.getSession();
          if (!session.session) return;

          const { data, error } = await supabase.functions.invoke('referral-intake', {
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
            body: { 
              referralCode: storedRefCode, 
              action: 'apply_attribution',
            },
          });

          if (error) {
            logger.error('Attribution error', error);
            return;
          }

          if (data?.success) {
            logger.info('Attribution successful', { message: data.message });
            // Mark as processed
            localStorage.setItem('nutrizen_referral_processed', 'true');
            localStorage.removeItem('nutrizen_referral_code');
          } else {
            logger.debug('Attribution response', { message: data?.message });
            // Still mark as processed to avoid retrying invalid codes
            if (data?.message?.includes('invalide') || data?.already_attributed) {
              localStorage.setItem('nutrizen_referral_processed', 'true');
              localStorage.removeItem('nutrizen_referral_code');
            }
          }
        } catch (err) {
          logger.error('Attribution error', err instanceof Error ? err : new Error(String(err)));
        }
      };

      applyAttribution();
    }
  }, [user]);
}

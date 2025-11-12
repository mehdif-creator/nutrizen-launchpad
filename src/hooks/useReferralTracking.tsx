import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useReferralSignup } from './useReferralSignup';

/**
 * Hook to track referral codes from URL parameters
 * Stores the referral code and processes it when user signs up
 */
export function useReferralTracking() {
  const location = useLocation();
  const { user } = useAuth();
  const referralSignup = useReferralSignup();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get('ref');

    if (refCode) {
      // Store referral code in localStorage
      localStorage.setItem('nutrizen_referral_code', refCode);
      console.log('Referral code captured:', refCode);
    }
  }, [location]);

  // Process stored referral code when user signs up/logs in
  useEffect(() => {
    if (!user) return;

    const storedRefCode = localStorage.getItem('nutrizen_referral_code');
    const processedFlag = localStorage.getItem('nutrizen_referral_processed');

    if (storedRefCode && !processedFlag) {
      console.log('Processing referral code for new user:', storedRefCode);
      
      referralSignup.mutate(storedRefCode, {
        onSuccess: () => {
          // Mark as processed
          localStorage.setItem('nutrizen_referral_processed', 'true');
          localStorage.removeItem('nutrizen_referral_code');
        },
      });
    }
  }, [user, referralSignup]);
}

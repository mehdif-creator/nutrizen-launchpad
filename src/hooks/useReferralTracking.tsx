import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to track referral codes from URL parameters
 * Stores the referral code in localStorage for use during signup
 */
export function useReferralTracking() {
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get('ref');

    if (refCode) {
      // Store referral code in localStorage
      localStorage.setItem('nutrizen_referral_code', refCode);
      console.log('Referral code captured:', refCode);
    }
  }, [location]);
}

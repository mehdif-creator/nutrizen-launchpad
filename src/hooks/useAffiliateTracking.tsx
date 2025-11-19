import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to track affiliate codes from URL parameters
 * Stores the affiliate code in session for checkout attribution
 */
export function useAffiliateTracking() {
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const affCode = searchParams.get('aff');

    if (affCode) {
      // Store affiliate code in sessionStorage
      sessionStorage.setItem('nutrizen_affiliate_code', affCode);
      console.log('Affiliate code captured:', affCode);
    }
  }, [location]);
}

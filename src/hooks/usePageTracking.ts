import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

/**
 * Fires Meta PageView + Pinterest pagevisit on every SPA route change
 * (including the initial mount). Must be used inside a Router context.
 */
export const usePageTracking = (): void => {
  const location = useLocation();

  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
};

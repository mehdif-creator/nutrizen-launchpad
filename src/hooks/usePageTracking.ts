import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';
import { trackGaPageView } from '@/lib/ga';

/**
 * Fires Meta PageView + Pinterest pagevisit + GA4 page_view on every SPA
 * route change (including the initial mount). Must be used inside a Router context.
 */
export const usePageTracking = (): void => {
  const location = useLocation();

  useEffect(() => {
    trackPageView();
    trackGaPageView(location.pathname);
  }, [location.pathname]);
};

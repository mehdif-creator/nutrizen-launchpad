import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createLogger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

const logger = createLogger('ReferralRedirect');

/**
 * Handles /i/:code — stores referral code and redirects to home.
 * The existing useReferralTracking hook (listening for ?ref=) will
 * pick up the code on the landing page.
 */
export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true });
      return;
    }

    // Store referral code exactly like useReferralTracking does
    localStorage.setItem('nutrizen_referral_code', code);
    logger.info('Referral code captured from /i/ route', { code });

    // Track click (non-blocking)
    supabase.functions.invoke('referral-intake', {
      body: { referralCode: code, action: 'track_click' },
    }).catch(err => logger.debug('Click tracking error', { error: String(err) }));

    // Redirect to home with ?ref= so the existing tracking hook also fires
    // Redirect to pricing section to encourage signup
    navigate(`/?ref=${encodeURIComponent(code)}#pricing`, { replace: true });
  }, [code, navigate]);

  return null;
}

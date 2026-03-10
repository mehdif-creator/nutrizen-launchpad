import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AffiliateTracking');

/**
 * Cookie helper: set a cookie with expiry in days
 */
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Hook to track affiliate codes from URL parameters.
 * Stores in nz_ref cookie (30-day expiry).
 * On signup, creates affiliate_referrals row.
 */
export function useAffiliateTracking() {
  const location = useLocation();
  const { user } = useAuth();

  // Capture ?ref= into cookie (also handles ?aff= for backward compat)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get('ref') || searchParams.get('aff');

    if (refCode) {
      // Only store if it looks like an affiliate code (starts with AFF)
      if (refCode.startsWith('AFF')) {
        setCookie('nz_ref', refCode, 30);
        logger.info('Affiliate code captured', { refCode });
      }
      // Also keep sessionStorage for backward compat
      sessionStorage.setItem('nutrizen_affiliate_code', refCode);
    }
  }, [location]);

  // On user login/signup, attribute referral
  useEffect(() => {
    if (!user) return;

    const affCode = getCookie('nz_ref');
    const processed = localStorage.getItem('nz_aff_processed');

    if (affCode && !processed) {
      const applyAttribution = async () => {
        try {
          // Check if this user already has an affiliate referral
          const { data: existing } = await supabase
            .from('affiliate_referrals')
            .select('id')
            .eq('referred_user_id', user.id)
            .maybeSingle();

          if (existing) {
            logger.info('User already has affiliate referral, skipping');
            localStorage.setItem('nz_aff_processed', 'true');
            return;
          }

          // Verify the affiliate code exists
          const { data: affiliate } = await supabase
            .from('affiliates')
            .select('affiliate_code, user_id')
            .eq('affiliate_code', affCode)
            .eq('is_active', true)
            .maybeSingle();

          if (!affiliate) {
            logger.info('Affiliate code not found or inactive', { affCode });
            localStorage.setItem('nz_aff_processed', 'true');
            return;
          }

          // Don't allow self-referral
          if (affiliate.user_id === user.id) {
            logger.info('Self-referral blocked');
            localStorage.setItem('nz_aff_processed', 'true');
            return;
          }

          // Insert referral
          const { error } = await supabase.from('affiliate_referrals').insert({
            affiliate_code: affCode,
            referred_user_id: user.id,
            converted: false,
          });

          if (error) {
            logger.error('Error inserting affiliate referral', error);
          } else {
            logger.info('Affiliate referral created', { affCode });
            localStorage.setItem('nz_aff_processed', 'true');
          }
        } catch (err) {
          logger.error('Affiliate attribution error', err instanceof Error ? err : new Error(String(err)));
        }
      };

      applyAttribution();
    }
  }, [user]);
}

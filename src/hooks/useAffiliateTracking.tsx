import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AffiliateTracking');

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function useAffiliateTracking() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get('ref') || searchParams.get('aff');

    if (refCode && refCode.startsWith('AFF')) {
      setCookie('nz_ref', refCode, 30);
      logger.info('Affiliate code captured', { refCode });
    }
  }, [location]);

  useEffect(() => {
    if (!user) return;

    const affCode = getCookie('nz_ref');
    const processed = localStorage.getItem('nz_aff_processed');

    if (affCode && !processed) {
      const applyAttribution = async () => {
        try {
          // Check if this user already has an affiliate referral
          const { data: existing } = await (supabase as any)
            .from('affiliate_referrals')
            .select('id')
            .eq('referred_user_id', user.id)
            .maybeSingle();

          if (existing) {
            localStorage.setItem('nz_aff_processed', 'true');
            return;
          }

          // Verify the affiliate code exists
          const { data: affiliate } = await (supabase as any)
            .from('affiliates')
            .select('affiliate_code, user_id')
            .eq('affiliate_code', affCode)
            .eq('is_active', true)
            .maybeSingle();

          if (!affiliate || affiliate.user_id === user.id) {
            localStorage.setItem('nz_aff_processed', 'true');
            return;
          }

          await (supabase as any).from('affiliate_referrals').insert({
            affiliate_code: affCode,
            referred_user_id: user.id,
            converted: false,
          });

          localStorage.setItem('nz_aff_processed', 'true');
          logger.info('Affiliate referral created', { affCode });
        } catch (err) {
          logger.error('Affiliate attribution error', err instanceof Error ? err : new Error(String(err)));
        }
      };

      applyAttribution();
    }
  }, [user]);
}

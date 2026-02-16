import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useReferralSignup');

/**
 * Hook to apply referral attribution via the consolidated referral-intake endpoint.
 * Always uses the authenticated user's JWT — no client-provided user IDs.
 */
export function useReferralSignup() {
  return useMutation({
    mutationFn: async (referralCode: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('referral-intake', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: { referralCode, action: 'apply_attribution' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data.message || 'Parrainage enregistré!');
      } else if (data?.already_attributed) {
        toast.info(data.message || 'Parrainage déjà enregistré');
      } else {
        toast.info(data?.message || 'Code de parrainage invalide');
      }
    },
    onError: (error: unknown) => {
      logger.error('Referral signup error', error instanceof Error ? error : new Error(String(error)));
      toast.error("Erreur lors de l'enregistrement du parrainage");
    },
  });
}

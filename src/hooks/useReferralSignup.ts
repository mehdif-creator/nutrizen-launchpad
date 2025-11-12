import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useReferralSignup() {
  return useMutation({
    mutationFn: async (referralCode: string) => {
      const { data, error } = await supabase.functions.invoke('track-referral', {
        body: { referralCode },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Parrainage enregistré!');
      } else {
        toast.info(data.message || 'Code de parrainage invalide');
      }
    },
    onError: (error: any) => {
      console.error('Referral signup error:', error);
      toast.error('Erreur lors de l\'enregistrement du parrainage');
    },
  });
}

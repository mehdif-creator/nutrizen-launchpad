import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
  active: boolean;
  sort_order: number;
}

// Fallback packs if database is unavailable
const FALLBACK_PACKS: CreditPack[] = [
  { id: 'pack_s', name: 'Pack S', credits: 50, price_cents: 499, currency: 'eur', stripe_price_id: null, active: true, sort_order: 1 },
  { id: 'pack_m', name: 'Pack M', credits: 120, price_cents: 999, currency: 'eur', stripe_price_id: null, active: true, sort_order: 2 },
  { id: 'pack_l', name: 'Pack L', credits: 300, price_cents: 1999, currency: 'eur', stripe_price_id: null, active: true, sort_order: 3 },
  { id: 'pack_xl', name: 'Pack XL', credits: 700, price_cents: 3999, currency: 'eur', stripe_price_id: null, active: true, sort_order: 4 },
];

export function useCreditPacks() {
  const [packs, setPacks] = useState<CreditPack[]>(FALLBACK_PACKS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_packs')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching credit packs:', error);
        setError(error.message);
        // Use fallback packs
        return;
      }

      if (data && data.length > 0) {
        setPacks(data);
      }
    } catch (err) {
      console.error('Error in useCreditPacks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string = 'eur') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getPricePerCredit = (pack: CreditPack) => {
    return (pack.price_cents / pack.credits / 100).toFixed(3);
  };

  return {
    packs,
    loading,
    error,
    formatPrice,
    getPricePerCredit,
    refetch: fetchPacks,
  };
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlags {
  subscription_off: boolean;
  [key: string]: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  subscription_off: true, // Default to hiding subscriptions
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, enabled');

      if (error) {
        console.error('Error fetching feature flags:', error);
        return;
      }

      const fetchedFlags: FeatureFlags = { ...DEFAULT_FLAGS };
      
      data?.forEach((flag) => {
        fetchedFlags[flag.key] = flag.enabled ?? DEFAULT_FLAGS[flag.key] ?? false;
      });

      setFlags(fetchedFlags);
    } catch (error) {
      console.error('Error in useFeatureFlags:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    flags,
    loading,
    isSubscriptionOff: flags.subscription_off,
    refetch: fetchFlags,
  };
}

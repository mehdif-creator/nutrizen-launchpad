import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ZenCreditsDisplayProps {
  userId?: string;
  showBuyButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ZenCreditsDisplay({ 
  userId, 
  showBuyButton = true,
  size = 'md' 
}: ZenCreditsDisplayProps) {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchCredits();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_wallets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchCredits = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('credits_total')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No wallet yet, default to 0
          setCredits(0);
        } else {
          console.error('Error fetching credits:', error);
        }
      } else {
        setCredits(data?.credits_total ?? 0);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-32"></div>
      </Card>
    );
  }

  const sizeClasses = {
    sm: 'text-sm p-3',
    md: 'text-base p-4',
    lg: 'text-lg p-6',
  };

  return (
    <Card className={`${sizeClasses[size]} flex items-center justify-between gap-4`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <Sparkles className={`text-primary ${size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'}`} />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Crédits Zen</p>
          <p className={`font-bold ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-lg'}`}>
            {credits ?? 0}
          </p>
        </div>
      </div>
      
      {showBuyButton && (
        <Button
          size={size === 'lg' ? 'default' : 'sm'}
          onClick={() => navigate('/app/pricing')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Acheter
        </Button>
      )}
    </Card>
  );
}

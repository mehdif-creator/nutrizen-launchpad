import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CreditTransactionsModal } from './CreditTransactionsModal';

interface ZenCreditsDisplayProps {
  userId?: string;
  showBuyButton?: boolean;
  showHistoryButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ZenCreditsDisplay({ 
  userId, 
  showBuyButton = true,
  showHistoryButton = true,
  size = 'md' 
}: ZenCreditsDisplayProps) {
  const [subscriptionCredits, setSubscriptionCredits] = useState<number>(0);
  const [lifetimeCredits, setLifetimeCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
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
        .select('subscription_credits, lifetime_credits')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No wallet yet, default to 0
          setSubscriptionCredits(0);
          setLifetimeCredits(0);
        } else {
          console.error('Error fetching credits:', error);
        }
      } else {
        setSubscriptionCredits(data?.subscription_credits ?? 0);
        setLifetimeCredits(data?.lifetime_credits ?? 0);
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

  const totalCredits = subscriptionCredits + lifetimeCredits;

  return (
    <>
      <div className="space-y-3">
        <Card className={`${sizeClasses[size]} space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className={`text-primary ${size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Crédits Zen</p>
                <p className={`font-bold ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-lg'}`}>
                  {totalCredits}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {showHistoryButton && userId && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setHistoryOpen(true)}
                  title="Voir mes transactions"
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
              
              {showBuyButton && (
                <Button
                  size={size === 'lg' ? 'default' : 'sm'}
                  onClick={() => navigate('/credits')}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Acheter
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Crédits achetés</p>
              <p className="text-sm font-semibold text-foreground">{lifetimeCredits}</p>
              <p className="text-xs text-muted-foreground/70">Ne périment jamais</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Crédits abonnement</p>
              <p className="text-sm font-semibold text-foreground">{subscriptionCredits}</p>
              <p className="text-xs text-muted-foreground/70">Renouvelés mensuellement</p>
            </div>
          </div>
        </Card>
      </div>

      {userId && (
        <CreditTransactionsModal
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          userId={userId}
        />
      )}
    </>
  );
}

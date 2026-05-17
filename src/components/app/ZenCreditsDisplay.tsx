import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, History, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CreditTransactionsModal } from './CreditTransactionsModal';

type WalletState = 'loading' | 'ready' | 'missing' | 'error';

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
  size = 'md',
}: ZenCreditsDisplayProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [subscriptionCredits, setSubscriptionCredits] = useState<number | null>(null);
  const [lifetimeCredits, setLifetimeCredits] = useState<number | null>(null);
  const [walletState, setWalletState] = useState<WalletState>('loading');
  const [historyOpen, setHistoryOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) {
      setWalletState('loading');
      return;
    }

    fetchCredits();

    const channel = supabase
      .channel(`credits_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_wallets',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchCredits()
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
        .select('balance, subscription_credits, lifetime_credits')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No wallet row exists — this is NOT 0 credits, it's a missing row
          setWalletState('missing');
          setBalance(null);
          setSubscriptionCredits(null);
          setLifetimeCredits(null);
        } else {
          console.error('Error fetching credits:', error);
          setWalletState('error');
        }
      } else {
        setBalance((data as any)?.balance ?? 0);
        setSubscriptionCredits(data?.subscription_credits ?? 0);
        setLifetimeCredits(data?.lifetime_credits ?? 0);
        setWalletState('ready');
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      setWalletState('error');
    }
  };

  const handleRepairWallet = async () => {
    if (!userId) return;
    setWalletState('loading');
    try {
      const { data, error } = await (supabase.rpc as Function)('repair_user_bootstrap', {
        p_user_id: userId,
      });
      if (error) throw error;
      // Re-fetch after repair
      await fetchCredits();
    } catch (e) {
      console.error('Wallet repair failed:', e);
      setWalletState('error');
    }
  };

  // Loading skeleton
  if (walletState === 'loading') {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-32"></div>
      </Card>
    );
  }

  // Missing wallet — distinct from 0 credits
  if (walletState === 'missing' || walletState === 'error') {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {walletState === 'missing'
                ? "Portefeuille en cours d'initialisation"
                : 'Erreur de chargement des crédits'}
            </p>
            <p className="text-xs text-muted-foreground">
              {walletState === 'missing'
                ? 'Ton portefeuille sera prêt dans un instant.'
                : 'Impossible de charger tes crédits.'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleRepairWallet} className="w-full gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          {walletState === 'missing' ? 'Initialiser' : 'Réessayer'}
        </Button>
      </Card>
    );
  }

  const sizeClasses = {
    sm: 'text-sm p-3',
    md: 'text-base p-4',
    lg: 'text-lg p-6',
  };

  const totalCredits = balance;

  return (
    <>
      <div className="space-y-3">
        <Card className={`${sizeClasses[size]} space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles
                  className={`text-primary ${size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'}`}
                />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Crédits Zen</p>
                <p
                  className={`font-bold ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-lg'}`}
                >
                  {totalCredits ?? '—'}
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
                  onClick={() => navigate('/app/credits')}
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
              <p className="text-sm font-semibold text-foreground">{lifetimeCredits ?? '—'}</p>
              <p className="text-xs text-muted-foreground/70">Ne périment jamais</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Crédits abonnement</p>
              <p className="text-sm font-semibold text-foreground">{subscriptionCredits ?? '—'}</p>
              <p className="text-xs text-muted-foreground/70">Renouvelés mensuellement</p>
            </div>
          </div>
        </Card>
      </div>

      {userId && (
        <CreditTransactionsModal open={historyOpen} onOpenChange={setHistoryOpen} userId={userId} />
      )}
    </>
  );
}

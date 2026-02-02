import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Zap, TrendingUp, Crown, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const PlanDisplay = () => {
  const { subscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [swapsData, setSwapsData] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    loadSwapsData();
  }, []);

  const loadSwapsData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const { data } = await supabase
      .from('swaps')
      .select('used, quota')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .maybeSingle();

    if (data) {
      setSwapsData(data);
    } else {
      setSwapsData({ used: 0, quota: 10 });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir le portail de gestion',
        variant: 'destructive',
      });
    }
  };

  if (!subscription) return null;

  const isTrialing = subscription.status === 'trialing';
  const planName = subscription.plan || 'Gratuit à vie';
  
  const getDaysRemaining = () => {
    if (!subscription.trial_end && !subscription.current_period_end) return null;
    
    const endDate = new Date(subscription.trial_end || subscription.current_period_end || '');
    const now = new Date();
    const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return diff > 0 ? diff : 0;
  };

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3 && isTrialing;

  const handleUpgrade = () => {
    navigate('/?pricing=true');
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
            Mon Abonnement
            {!isTrialing && <Crown className="h-5 w-5 text-yellow-500" />}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant={isTrialing ? "secondary" : "default"}>
              {planName}
            </Badge>
          {isTrialing && (
            <span className="text-sm text-muted-foreground">
              (Gratuit à vie)
            </span>
          )}
          </div>
        </div>
        <div className="flex gap-2">
          {isTrialing && (
            <Button 
              size="sm"
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Passer Premium
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleManageSubscription}
          >
            Gérer
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isExpiringSoon && (
          <div className="flex items-center gap-2 text-sm bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-3">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <span className="text-foreground font-medium">
              ⏰ Plus que {daysRemaining} jour{daysRemaining! > 1 ? 's' : ''} d'essai ! Profite de l'offre avant qu'il ne soit trop tard.
            </span>
          </div>
        )}

        {daysRemaining !== null && !isExpiringSoon && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              {isTrialing 
                ? `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} d'essai restant${daysRemaining > 1 ? 's' : ''}`
                : `Renouvellement dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`
              }
            </span>
          </div>
        )}

        {swapsData && (
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-accent" />
            <span>
              {swapsData.quota - swapsData.used} swap{(swapsData.quota - swapsData.used) > 1 ? 's' : ''} restant{(swapsData.quota - swapsData.used) > 1 ? 's' : ''} ce mois
            </span>
          </div>
        )}

        {!isTrialing && (
          <div className="flex items-center gap-2 text-sm bg-primary/10 rounded-lg p-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-foreground">
              Accès complet à toutes les fonctionnalités premium
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

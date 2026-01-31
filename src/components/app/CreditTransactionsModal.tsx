import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CreditTransaction {
  id: string;
  delta: number;
  reason: string;
  credit_type: string;
  feature: string | null;
  created_at: string;
}

interface CreditTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function CreditTransactionsModal({
  open,
  onOpenChange,
  userId,
}: CreditTransactionsModalProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      fetchTransactions();
    }
  }, [open, userId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, delta, reason, credit_type, feature, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd MMM yyyy à HH:mm', { locale: fr });
  };

  const getReasonDisplay = (tx: CreditTransaction) => {
    if (tx.feature) {
      const featureMap: Record<string, string> = {
        swap: 'Changement de recette',
        inspifrigo: 'InspiFrigo',
        scanrepas: 'ScanRepas',
        menu_generation: 'Génération de menu',
      };
      return featureMap[tx.feature] || tx.feature;
    }
    return tx.reason || 'Transaction';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'lifetime':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'mixed':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'Abonnement';
      case 'lifetime':
        return 'Permanent';
      case 'mixed':
        return 'Mixte';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Historique des Crédits Zen
          </DialogTitle>
          <DialogDescription>
            Les 50 dernières transactions de ton compte
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucune transaction pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className={`p-2 rounded-full ${tx.delta >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    {tx.delta >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {getReasonDisplay(tx)}
                      </span>
                      <span className={`font-bold text-sm ${tx.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.delta >= 0 ? '+' : ''}{tx.delta}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-xs ${getTypeColor(tx.credit_type)}`}>
                        {getTypeLabel(tx.credit_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(tx.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="pt-4 border-t">
          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

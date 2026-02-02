import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardAdvice } from '@/hooks/useUserDashboard';

const CATEGORY_LABELS: Record<string, string> = {
  nutrition: 'Nutrition',
  organisation: 'Organisation',
  motivation: 'Motivation',
  recette: 'Recette',
  economie: 'Économie',
};

const CATEGORY_COLORS: Record<string, string> = {
  nutrition: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  organisation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  motivation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  recette: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  economie: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

interface DailyAdviceCardProps {
  advice: DashboardAdvice | null;
  isLoading: boolean;
  userId?: string;
}

export function DailyAdviceCard({ advice, isLoading, userId }: DailyAdviceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [isRead, setIsRead] = useState(false);

  const handleMarkRead = async () => {
    if (!userId || !advice?.id || isRead) return;

    setMarkingRead(true);
    try {
      await supabase
        .from('user_daily_advice_seen')
        .upsert({ user_id: userId, advice_id: advice.id });
      setIsRead(true);
    } catch (error) {
      console.error('Error marking advice as read:', error);
    } finally {
      setMarkingRead(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-sm p-4 md:p-5 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="text-sm md:text-base font-semibold">Conseil du jour</h3>
        </div>
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
        <p className="text-xs text-muted-foreground mt-2">Analyse nutritionnelle en cours…</p>
      </Card>
    );
  }

  // Fallback: always show something even if advice is missing
  const displayAdvice = advice && advice.title ? advice : {
    id: null,
    title: 'Bienvenue sur NutriZen',
    text: 'Planifie tes repas pour gagner du temps et manger équilibré. Génère ton premier menu pour commencer !',
    category: 'motivation',
    date: new Date().toISOString(),
    is_today: true,
  };

  // This should never happen with the fallback above, but keep as safety
  if (!displayAdvice.title) {
    return (
      <Card className="rounded-2xl border shadow-sm p-4 md:p-5 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="text-sm md:text-base font-semibold">Conseil du jour</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Aucun conseil disponible aujourd'hui. Revenez demain pour un nouveau conseil !
        </p>
      </Card>
    );
  }

  const isLong = displayAdvice.text.length > 150;
  const displayText = expanded || !isLong ? displayAdvice.text : displayAdvice.text.substring(0, 150) + '...';

  return (
    <Card className="rounded-2xl border shadow-sm p-4 md:p-5 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="text-sm md:text-base font-semibold">Conseil du jour</h3>
        </div>
        <Badge className={CATEGORY_COLORS[displayAdvice.category] || 'bg-muted'}>
          {CATEGORY_LABELS[displayAdvice.category] || displayAdvice.category}
        </Badge>
      </div>

      <h4 className="font-medium text-foreground mb-2">{displayAdvice.title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{displayText}</p>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {isLong && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Réduire
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Lire plus
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!displayAdvice.is_today && (
            <span className="text-xs text-muted-foreground">
              (conseil récent)
            </span>
          )}
          {displayAdvice.id && !isRead && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkRead}
              disabled={markingRead}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              {markingRead ? 'Enregistré...' : "Je l'ai lu"}
            </Button>
          )}
          {isRead && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Lu
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

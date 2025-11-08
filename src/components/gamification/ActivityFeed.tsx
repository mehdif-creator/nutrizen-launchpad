import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Coins, Flame, Trophy, Share2, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Event {
  type: string;
  points: number;
  credits: number;
  at: string;
  meta: Record<string, any>;
}

interface ActivityFeedProps {
  events: Event[];
}

const EVENT_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  APP_OPEN: { icon: Sparkles, color: 'text-blue-500', label: 'App ouverte' },
  MEAL_VALIDATED: { icon: Calendar, color: 'text-green-500', label: 'Repas validé' },
  DAY_COMPLETED: { icon: Trophy, color: 'text-purple-500', label: 'Journée complète' },
  WEEKLY_CHALLENGE_COMPLETED: { icon: Trophy, color: 'text-yellow-500', label: 'Challenge terminé' },
  SOCIAL_SHARE: { icon: Share2, color: 'text-pink-500', label: 'Partage social' },
  POINTS_REDEEMED_TO_CREDITS: { icon: Coins, color: 'text-primary', label: 'Points convertis' },
  STREAK_MILESTONE: { icon: Flame, color: 'text-orange-500', label: 'Palier de série' },
  BADGE_GRANTED: { icon: Trophy, color: 'text-yellow-500', label: 'Badge débloqué' },
  REFERRAL_GRANTED: { icon: Sparkles, color: 'text-blue-500', label: 'Parrainage' },
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Activité récente</h2>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {events.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">
              Aucune activité récente. Commencez à gagner des points!
            </p>
          )}
          {events.map((event, index) => {
            const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.APP_OPEN;
            const Icon = config.icon;
            
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={`p-2 rounded-full bg-background ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(event.at), { 
                          addSuffix: true,
                          locale: fr 
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {event.points !== 0 && (
                        <Badge 
                          variant="outline" 
                          className={event.points > 0 ? 'text-green-500 border-green-500' : 'text-red-500 border-red-500'}
                        >
                          {event.points > 0 ? '+' : ''}{event.points} pts
                        </Badge>
                      )}
                      {event.credits !== 0 && (
                        <Badge 
                          variant="outline" 
                          className={event.credits > 0 ? 'text-primary border-primary' : 'text-muted-foreground'}
                        >
                          {event.credits > 0 ? '+' : ''}{event.credits} crédits
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Check, Award, Target, Flame, Star, Zap, Heart } from 'lucide-react';

interface BadgesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BadgeData {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  earned: boolean;
  earned_at?: string;
}

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Award,
  target: Target,
  flame: Flame,
  star: Star,
  zap: Zap,
  heart: Heart,
};

export function BadgesModal({ open, onOpenChange }: BadgesModalProps) {
  const { user } = useAuth();

  const { data: badges, isLoading } = useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all badges
      const { data: allBadges, error: badgesError } = await supabase
        .from('badges')
        .select('code, name, description, icon')
        .order('created_at');

      if (badgesError) throw badgesError;

      // Get user's earned badges
      const { data: userBadges, error: userError } = await supabase
        .from('user_badges')
        .select('badge_code, granted_at')
        .eq('user_id', user.id);

      if (userError) throw userError;

      const earnedSet = new Set(userBadges?.map(ub => ub.badge_code) || []);
      const earnedDates = Object.fromEntries(
        userBadges?.map(ub => [ub.badge_code, ub.granted_at]) || []
      );

      return (allBadges || []).map(badge => ({
        ...badge,
        earned: earnedSet.has(badge.code),
        earned_at: earnedDates[badge.code],
      })) as BadgeData[];
    },
    enabled: open && !!user?.id,
    staleTime: 60 * 1000,
  });

  const earnedBadges = badges?.filter(b => b.earned) || [];
  const lockedBadges = badges?.filter(b => !b.earned) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Mes badges
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : badges?.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aucun badge disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Earned badges */}
            {earnedBadges.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 text-primary">
                  Débloqués ({earnedBadges.length})
                </h4>
                <div className="space-y-3">
                  {earnedBadges.map(badge => {
                    const IconComponent = BADGE_ICONS[badge.icon || 'trophy'] || Award;
                    return (
                      <div
                        key={badge.code}
                        className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <div className="p-2 rounded-full bg-primary/20">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{badge.name}</span>
                            <Check className="h-3 w-3 text-green-500" />
                          </div>
                          {badge.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {badge.description}
                            </p>
                          )}
                        </div>
                        {badge.earned_at && (
                          <BadgeUI variant="secondary" className="text-xs">
                            {new Date(badge.earned_at).toLocaleDateString('fr-FR')}
                          </BadgeUI>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Locked badges */}
            {lockedBadges.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                  À débloquer ({lockedBadges.length})
                </h4>
                <div className="space-y-3">
                  {lockedBadges.map(badge => {
                    const IconComponent = BADGE_ICONS[badge.icon || 'trophy'] || Award;
                    return (
                      <div
                        key={badge.code}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-60"
                      >
                        <div className="p-2 rounded-full bg-muted">
                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground">{badge.name}</span>
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          </div>
                          {badge.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {badge.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BadgeItem {
  code: string;
  name: string;
  description: string;
  icon: string;
  grantedAt?: string;
}

const ALL_BADGES: BadgeItem[] = [
  { code: 'DISCIPLINE_GOLD', name: 'Discipline Gold', description: '30-day streak achieved', icon: '🔥' },
  { code: 'FAST_COOK', name: 'Fast Cook', description: '10 recipes under 15 minutes', icon: '⚡' },
  { code: 'ZERO_WASTE', name: 'Zero Waste', description: '3 weeks full menu completion', icon: '♻️' },
  { code: 'VIRAL_SHARER', name: 'Viral Sharer', description: '10 social shares', icon: '📣' },
  { code: 'MENTOR_ZEN', name: 'Mentor Zen', description: '5 active referrals', icon: '🧑‍🏫' },
];

interface BadgesCarouselProps {
  earnedBadges: Array<{
    code: string;
    grantedAt: string;
    name: string;
    description: string;
    icon: string;
  }>;
}

export function BadgesCarousel({ earnedBadges }: BadgesCarouselProps) {
  const earnedCodes = new Set(earnedBadges.map(b => b.code));

  const badges = ALL_BADGES.map(badge => ({
    ...badge,
    earned: earnedCodes.has(badge.code),
    grantedAt: earnedBadges.find(b => b.code === badge.code)?.grantedAt,
  }));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Badges ({earnedBadges.length}/{ALL_BADGES.length})</h2>
        <Badge variant="secondary">{earnedBadges.length} débloqués</Badge>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {badges.map((badge, index) => (
          <TooltipProvider key={badge.code}>
            <Tooltip>
              <TooltipTrigger>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex-shrink-0 w-24 h-24 rounded-lg border-2 flex items-center justify-center relative ${
                    badge.earned
                      ? 'bg-primary/10 border-primary shadow-lg'
                      : 'bg-muted/50 border-muted grayscale opacity-50'
                  }`}
                >
                  <span className="text-4xl">{badge.icon}</span>
                  {!badge.earned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {badge.earned && (
                    <motion.div
                      className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-semibold">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  {badge.earned && badge.grantedAt && (
                    <p className="text-xs text-primary mt-1">
                      Débloqué le {new Date(badge.grantedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </Card>
  );
}
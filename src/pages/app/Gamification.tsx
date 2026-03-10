import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { ProgressionCardV2 } from '@/components/gamification/ProgressionCardV2';
import { ActivityFeedV2 } from '@/components/gamification/ActivityFeedV2';
import { PointRulesCard } from '@/components/gamification/PointRulesCard';
import { BadgesCarousel } from '@/components/gamification/BadgesCarousel';
import { ReferralWidget } from '@/components/gamification/ReferralWidget';
import { WalletCard } from '@/components/gamification/WalletCard';
import { StreakWidget } from '@/components/gamification/StreakWidget';
import { LeaderboardCard } from '@/components/gamification/LeaderboardCard';
import { useDashboard } from '@/hooks/useGamificationDashboard';
import { useGamificationState, useEmitGamificationEvent } from '@/hooks/useGamificationV2';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export default function Gamification() {
  const { user } = useAuth();
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();
  const { data: gamState, isLoading: gamLoading } = useGamificationState();
  const emit = useEmitGamificationEvent();
  const navigate = useNavigate();

  // Award app open on mount (once per day, idempotent via key)
  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    emit.mutate({
      eventType: 'APP_OPEN',
      idempotencyKey: `app_open:${user.id}:${today}`,
    });
  }, [user?.id]);

  const handleBuyCredits = () => {
    navigate('/app');
  };

  const isLoading = dashboardLoading || gamLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {dashboard?.profile.display_name
                ? `Salut, ${dashboard.profile.display_name} !`
                : 'Votre Tableau de Bord'}
            </h1>
            <p className="text-muted-foreground">
              Gagnez des points, montez de niveau et profitez de vos récompenses
            </p>
          </div>

          {/* V2 Progression Card */}
          <ProgressionCardV2 />

          {/* Point Rules */}
          <PointRulesCard />

          {/* Wallet */}
          {dashboard && (
            <WalletCard
              points={dashboard.wallet.points_total}
              credits={dashboard.wallet.credits_total}
              lifetimePoints={dashboard.wallet.lifetime_points}
              onBuyCredits={handleBuyCredits}
            />
          )}

          {/* Streak — use V2 state as source of truth */}
          {gamState && (
            <StreakWidget
              currentStreak={gamState.streak_days}
              longestStreak={dashboard?.streak.longest_streak_days ?? gamState.streak_days}
            />
          )}

          {/* Badges */}
          {dashboard && <BadgesCarousel earnedBadges={dashboard.badges} />}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* V2 Activity Feed */}
            <ActivityFeedV2 />

            {/* Leaderboard */}
            <LeaderboardCard />
          </div>

          {/* Referral */}
          {dashboard && (
            <ReferralWidget
              referralCode={dashboard.profile.referral_code}
              activeReferrals={dashboard.activeReferrals}
              freeMonthsEarned={dashboard.wallet.free_months_earned}
              freeMonthsUsed={dashboard.wallet.free_months_used}
            />
          )}
        </motion.div>
      </main>
      <AppFooter />
    </div>
  );
}

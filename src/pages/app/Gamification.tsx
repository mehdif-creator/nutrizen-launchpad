import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { ProgressionCardV2 } from '@/components/gamification/ProgressionCardV2';
import { ActivityFeedV2 } from '@/components/gamification/ActivityFeedV2';
import { PointRulesCard } from '@/components/gamification/PointRulesCard';
import { BadgesCarousel } from '@/components/gamification/BadgesCarousel';
import { ReferralWidget } from '@/components/gamification/ReferralWidget';
import { WalletCard } from '@/components/gamification/WalletCard';
import { StreakWidget } from '@/components/gamification/StreakWidget';
import { useDashboard } from '@/hooks/useGamificationDashboard';
import { useEmitAppOpen } from '@/hooks/useGamificationV2';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Gamification() {
  const { data: dashboard, isLoading } = useDashboard();
  const emitAppOpen = useEmitAppOpen();
  const navigate = useNavigate();

  // Award app open on mount (once per day, idempotent)
  useEffect(() => {
    emitAppOpen();
  }, []);

  const handleBuyCredits = () => {
    navigate('/pricing');
  };

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
                : 'Ton Tableau de Bord'}
            </h1>
            <p className="text-muted-foreground">
              Gagne des points, monte de niveau et profite de tes récompenses
            </p>
          </div>

          {/* V2 Progression Card (reads from user_gamification_state) */}
          <ProgressionCardV2 />

          {/* Point Rules */}
          <PointRulesCard />

          {/* Wallet (still from legacy dashboard) */}
          {dashboard && (
            <WalletCard
              points={dashboard.wallet.points_total}
              credits={dashboard.wallet.credits_total}
              lifetimePoints={dashboard.wallet.lifetime_points}
              onBuyCredits={handleBuyCredits}
            />
          )}

          {/* Streak */}
          {dashboard && (
            <StreakWidget
              currentStreak={dashboard.streak.current_streak_days}
              longestStreak={dashboard.streak.longest_streak_days}
            />
          )}

          {/* Badges */}
          {dashboard && <BadgesCarousel earnedBadges={dashboard.badges} />}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* V2 Activity Feed */}
            <ActivityFeedV2 />

            {/* Referral */}
            {dashboard && (
              <ReferralWidget
                referralCode={dashboard.profile.referral_code}
                activeReferrals={dashboard.activeReferrals}
                freeMonthsEarned={dashboard.wallet.free_months_earned}
                freeMonthsUsed={dashboard.wallet.free_months_used}
              />
            )}
          </div>
        </motion.div>
      </main>
      <AppFooter />
    </div>
  );
}

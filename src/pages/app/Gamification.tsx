import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { WalletCard } from '@/components/gamification/WalletCard';
import { StreakWidget } from '@/components/gamification/StreakWidget';
import { BadgesCarousel } from '@/components/gamification/BadgesCarousel';
import { WeeklyChallengeCard } from '@/components/gamification/WeeklyChallengeCard';
import { ActivityFeed } from '@/components/gamification/ActivityFeed';
import { ReferralWidget } from '@/components/gamification/ReferralWidget';
import { useDashboard, useAwardAppOpen } from '@/hooks/useGamificationDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Gamification() {
  const { data: dashboard, isLoading } = useDashboard();
  const awardAppOpen = useAwardAppOpen();
  const navigate = useNavigate();

  // Award app open on mount (once per day)
  useEffect(() => {
    awardAppOpen.mutate();
  }, []);

  const handleBuyCredits = () => {
    // Navigate to pricing or payment page
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

  if (!dashboard) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">
            Erreur de chargement du dashboard
          </p>
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
              {dashboard.profile.display_name ? `Salut, ${dashboard.profile.display_name}!` : 'Ton Tableau de Bord'}
            </h1>
            <p className="text-muted-foreground">
              Gagne des points, débloque des badges et profite de tes récompenses
            </p>
          </div>

          {/* Wallet */}
          <WalletCard
            points={dashboard.wallet.points_total}
            credits={dashboard.wallet.credits_total}
            lifetimePoints={dashboard.wallet.lifetime_points}
            onBuyCredits={handleBuyCredits}
          />

          {/* Streak */}
          <StreakWidget
            currentStreak={dashboard.streak.current_streak_days}
            longestStreak={dashboard.streak.longest_streak_days}
          />

          {/* Badges */}
          <BadgesCarousel earnedBadges={dashboard.badges} />

          {/* Weekly Challenge */}
          <WeeklyChallengeCard />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Feed */}
            <ActivityFeed events={dashboard.recentEvents} />

            {/* Referral */}
            <ReferralWidget
              referralCode={dashboard.profile.referral_code}
              activeReferrals={dashboard.activeReferrals}
            />
          </div>
        </motion.div>
      </main>
      <AppFooter />
    </div>
  );
}
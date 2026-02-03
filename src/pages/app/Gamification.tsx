import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { WalletCard } from '@/components/gamification/WalletCard';
import { StreakWidget } from '@/components/gamification/StreakWidget';
import { BadgesCarousel } from '@/components/gamification/BadgesCarousel';
import { ActivityFeed } from '@/components/gamification/ActivityFeed';
import { ReferralWidget } from '@/components/gamification/ReferralWidget';
import { ScoreZenWidget } from '@/components/gamification/ScoreZenWidget';
import { WeeklyChallenges } from '@/components/gamification/WeeklyChallenges';
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

  // Calculate Score Zen from dashboard data
  const scoreZen = Math.min(100, Math.max(0, 
    50 + 
    (dashboard.streak.current_streak_days * 5) + 
    (dashboard.badges.length * 3) +
    Math.floor(dashboard.wallet.points_total / 50)
  ));

  // Get current week number
  const weekNumber = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

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

          {/* Score Zen - NEW PROMINENT POSITION */}
          <ScoreZenWidget
            score={scoreZen}
            weeklyChange={dashboard.streak.current_streak_days > 0 ? 12 : -5}
            level={Math.min(4, Math.floor(dashboard.wallet.points_total / 250) + 1)}
            levelName={
              dashboard.wallet.points_total < 250 ? 'Apprenti Zen' :
              dashboard.wallet.points_total < 500 ? 'Cuisinier Serein' :
              dashboard.wallet.points_total < 1000 ? 'Maître Zen' : 'Zen Master'
            }
            nextLevelAt={
              dashboard.wallet.points_total < 250 ? 250 :
              dashboard.wallet.points_total < 500 ? 500 :
              dashboard.wallet.points_total < 1000 ? 1000 : 2000
            }
            streak={dashboard.streak.current_streak_days}
          />

          {/* Weekly Challenges - NEW */}
          <WeeklyChallenges weekNumber={weekNumber} />

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

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Feed */}
            <ActivityFeed events={dashboard.recentEvents} />

            {/* Referral */}
            <ReferralWidget
              referralCode={dashboard.profile.referral_code}
              activeReferrals={dashboard.activeReferrals}
              freeMonthsEarned={dashboard.wallet.free_months_earned}
              freeMonthsUsed={dashboard.wallet.free_months_used}
            />
          </div>
        </motion.div>
      </main>
      <AppFooter />
    </div>
  );
}
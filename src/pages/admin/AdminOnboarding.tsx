import { useState, useEffect } from 'react';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  BarChart3,
  RefreshCw,
  UserCheck,
  UserX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from 'react-router-dom';

interface OnboardingStats {
  totalUsers: number;
  completedOnboarding: number;
  inProgressOnboarding: number;
  notStartedOnboarding: number;
  completionRate: number;
  stepStats: {
    step0: number;
    step1: number;
    step2: number;
    step3: number;
    step4: number;
  };
  avgCompletionTimeHours: number;
  incompleteUsers: Array<{
    id: string;
    email: string;
    display_name: string | null;
    onboarding_step: number;
    created_at: string;
    days_since_signup: number;
  }>;
}

export default function AdminOnboarding() {
  const [stats, setStats] = useState<OnboardingStats>({
    totalUsers: 0,
    completedOnboarding: 0,
    inProgressOnboarding: 0,
    notStartedOnboarding: 0,
    completionRate: 0,
    stepStats: {
      step0: 0,
      step1: 0,
      step2: 0,
      step3: 0,
      step4: 0,
    },
    avgCompletionTimeHours: 0,
    incompleteUsers: [],
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get all user profiles with onboarding data
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, display_name, onboarding_step, onboarding_completed, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get emails from profiles table (auth schema data)
      const { data: authProfiles, error: authError } = await supabase
        .from('profiles')
        .select('id, email');

      if (authError) throw authError;

      // Create a map of user IDs to emails
      const emailMap = new Map(authProfiles?.map(p => [p.id, p.email]) || []);

      const totalUsers = profiles?.length || 0;
      const completedOnboarding = profiles?.filter(p => p.onboarding_completed).length || 0;
      const inProgressOnboarding = profiles?.filter(p => !p.onboarding_completed && p.onboarding_step > 0).length || 0;
      const notStartedOnboarding = profiles?.filter(p => p.onboarding_step === 0 && !p.onboarding_completed).length || 0;

      // Step distribution
      const stepStats = {
        step0: profiles?.filter(p => p.onboarding_step === 0 && !p.onboarding_completed).length || 0,
        step1: profiles?.filter(p => p.onboarding_step === 1).length || 0,
        step2: profiles?.filter(p => p.onboarding_step === 2).length || 0,
        step3: profiles?.filter(p => p.onboarding_step === 3).length || 0,
        step4: profiles?.filter(p => p.onboarding_step === 4 || p.onboarding_completed).length || 0,
      };

      // Calculate average completion time for completed onboarding
      const completedUsers = profiles?.filter(p => p.onboarding_completed) || [];
      let totalCompletionTime = 0;
      
      for (const user of completedUsers) {
        const createdAt = new Date(user.created_at);
        const now = new Date();
        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        totalCompletionTime += hoursElapsed;
      }

      const avgCompletionTimeHours = completedUsers.length > 0 
        ? totalCompletionTime / completedUsers.length 
        : 0;

      // Get incomplete users (not completed onboarding)
      const incompleteProfiles = profiles?.filter(p => !p.onboarding_completed) || [];
      const incompleteUsers = incompleteProfiles.map(user => {
        const createdAt = new Date(user.created_at);
        const now = new Date();
        const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: user.id,
          email: emailMap.get(user.id) || 'N/A',
          display_name: user.display_name,
          onboarding_step: user.onboarding_step,
          created_at: user.created_at,
          days_since_signup: daysSinceSignup,
        };
      });

      setStats({
        totalUsers,
        completedOnboarding,
        inProgressOnboarding,
        notStartedOnboarding,
        completionRate: totalUsers > 0 ? (completedOnboarding / totalUsers) * 100 : 0,
        stepStats,
        avgCompletionTimeHours,
        incompleteUsers: incompleteUsers.slice(0, 50), // Limit to 50 for performance
      });

      toast({
        title: 'Statistiques chargées',
        description: 'Les données ont été actualisées.',
      });
    } catch (error) {
      console.error('Error fetching onboarding stats:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les statistiques.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepBadge = (step: number) => {
    const badges = [
      { label: 'Non démarré', variant: 'secondary' as const },
      { label: 'Étape 1/4', variant: 'default' as const },
      { label: 'Étape 2/4', variant: 'default' as const },
      { label: 'Étape 3/4', variant: 'default' as const },
      { label: 'Terminé', variant: 'default' as const },
    ];
    return badges[step] || badges[0];
  };

  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} heures`;
    } else {
      return `${(hours / 24).toFixed(1)} jours`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 container py-8">
          <div className="text-center">Chargement des statistiques d'onboarding...</div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
              ← Retour au dashboard
            </Link>
            <h1 className="text-4xl font-bold">Statistiques d'Onboarding</h1>
            <p className="text-muted-foreground mt-2">
              Analyse de l'adoption et de la complétion du parcours d'onboarding
            </p>
          </div>
          <Button onClick={fetchStats} variant="outline" disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs totaux</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Onboarding terminé</p>
                <p className="text-3xl font-bold">{stats.completedOnboarding}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.completionRate.toFixed(1)}% taux de complétion
                </p>
              </div>
              <UserCheck className="h-10 w-10 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-3xl font-bold">{stats.inProgressOnboarding}</p>
                <p className="text-xs text-amber-600 mt-1">
                  Étapes 1-3
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-amber-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Non démarré</p>
                <p className="text-3xl font-bold">{stats.notStartedOnboarding}</p>
                <p className="text-xs text-red-600 mt-1">
                  Étape 0
                </p>
              </div>
              <UserX className="h-10 w-10 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Completion Time */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <Clock className="h-10 w-10 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Temps moyen de complétion</p>
              <p className="text-3xl font-bold">{formatTime(stats.avgCompletionTimeHours)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Basé sur {stats.completedOnboarding} utilisateurs ayant terminé
              </p>
            </div>
          </div>
        </Card>

        {/* Step Distribution */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Distribution par étape</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(stats.stepStats).map(([step, count]) => {
              const stepNum = parseInt(step.replace('step', ''));
              const percentage = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0;
              const stepLabels = [
                'Non démarré (0/4)',
                'Remplir profil (1/4)',
                'Générer menu (2/4)',
                'Utiliser swaps (3/4)',
                'Découvrir outils (4/4)',
              ];

              return (
                <div key={step}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{stepLabels[stepNum]}</span>
                    <span className="text-sm text-muted-foreground">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stepNum === 4 ? 'bg-green-500' :
                        stepNum === 3 ? 'bg-blue-500' :
                        stepNum === 2 ? 'bg-amber-500' :
                        stepNum === 1 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Incomplete Users Table */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold">Utilisateurs n'ayant pas terminé l'onboarding</h2>
            <Badge variant="secondary">{stats.incompleteUsers.length}</Badge>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Étape actuelle</TableHead>
                  <TableHead>Jours depuis inscription</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.incompleteUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      Tous les utilisateurs ont terminé l'onboarding ! 🎉
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.incompleteUsers.map((user) => {
                    const stepBadge = getStepBadge(user.onboarding_step);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.display_name || 'Non défini'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={stepBadge.variant}>
                            {stepBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={user.days_since_signup > 7 ? 'text-red-600 font-medium' : ''}>
                            {user.days_since_signup} jours
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {stats.incompleteUsers.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Affichage des 50 premiers utilisateurs. {stats.notStartedOnboarding + stats.inProgressOnboarding > 50 ? 
                `${stats.notStartedOnboarding + stats.inProgressOnboarding - 50} utilisateurs supplémentaires non affichés.` : ''}
            </p>
          )}
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}

import { useState } from 'react';
import { AppFooter } from '@/components/app/AppFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAdminReferralFunnel } from '@/hooks/useAdminStats';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  MousePointerClick, 
  UserPlus, 
  CheckCircle2, 
  Gift, 
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  FlaskConical,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminReferrals() {
  const { toast } = useToast();
  const [period, setPeriod] = useState('30');
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const dateFrom = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const dateTo = new Date().toISOString().split('T')[0];

  const { data: stats, isLoading, refetch } = useAdminReferralFunnel(dateFrom, dateTo);

  const runTestHarness = async () => {
    setTestRunning(true);
    setTestResults(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Non authentifié');
      }

      const response = await supabase.functions.invoke('referral-test-harness', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setTestResults(response.data);

      toast({
        title: response.data.success ? 'Tests réussis ✓' : 'Tests échoués',
        description: response.data.message_fr,
        variant: response.data.success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('[AdminReferrals] Test harness error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exécuter les tests de parrainage.',
        variant: 'destructive',
      });
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Parrainage</h1>
              <p className="text-muted-foreground">
                Funnel de conversion et tests
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="90">90 jours</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Funnel Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-10 w-10 rounded mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ))
          ) : (
            <>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <MousePointerClick className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-3xl font-bold">{stats?.total_clicks || 0}</p>
                <p className="text-sm text-muted-foreground">Clics</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <UserPlus className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-3xl font-bold">{stats?.total_signups || 0}</p>
                <p className="text-sm text-muted-foreground">Inscriptions</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {stats?.conversion_click_to_signup || 0}% conv.
                </Badge>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="h-8 w-8 text-purple-500" />
                </div>
                <p className="text-3xl font-bold">{stats?.total_qualified || 0}</p>
                <p className="text-sm text-muted-foreground">Qualifiés</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {stats?.conversion_signup_to_qualified || 0}% conv.
                </Badge>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Gift className="h-8 w-8 text-amber-500" />
                </div>
                <p className="text-3xl font-bold">{stats?.total_rewards || 0}</p>
                <p className="text-sm text-muted-foreground">Récompenses</p>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <p className="text-3xl font-bold">
                  {stats?.total_clicks && stats.total_rewards 
                    ? ((stats.total_rewards / stats.total_clicks) * 100).toFixed(1) 
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Clic → Récompense</p>
              </Card>
            </>
          )}
        </div>

        {/* Test Harness */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Test du parcours parrainage
            </CardTitle>
            <CardDescription>
              Simule le parcours complet: clic → inscription → qualification → récompense
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button onClick={runTestHarness} disabled={testRunning}>
                {testRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <FlaskConical className="mr-2 h-4 w-4" />
                    Lancer le test
                  </>
                )}
              </Button>

              {testResults && (
                <Badge variant={testResults.success ? 'default' : 'destructive'}>
                  {testResults.summary.pass}/{testResults.summary.total} tests réussis
                </Badge>
              )}
            </div>

            {testResults && (
              <div className="mt-4 space-y-2">
                {testResults.results.map((result: any, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{result.step}</p>
                      <p className="text-sm text-muted-foreground">{result.message_fr}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Placeholder for top referrers table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top parrains
            </CardTitle>
            <CardDescription>
              Utilisateurs avec le plus de parrainages réussis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Les données seront affichées ici une fois le système actif.
            </p>
          </CardContent>
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}

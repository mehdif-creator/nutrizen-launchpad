import { useState } from 'react';
import { AppFooter } from '@/components/app/AppFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Loader2, Play, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, Activity, Bell, RefreshCw, Shield,
} from 'lucide-react';
import { useHealthCheck, HealthCheckResult } from '@/hooks/useHealthCheck';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CHECK_LABELS: Record<string, { label: string; icon: string }> = {
  supabase_connection: { label: 'Connexion Supabase', icon: '🔌' },
  safety_gate: { label: 'Sécurité alimentaire', icon: '🛡️' },
  credit_consistency: { label: 'Cohérence crédits', icon: '💰' },
  stuck_jobs: { label: 'Jobs bloqués', icon: '⏱️' },
  images_integrity: { label: 'Intégrité images', icon: '🖼️' },
  stripe_config: { label: 'Configuration Stripe', icon: '💳' },
  realtime_tables: { label: 'Tables temps réel', icon: '📡' },
  menu_pipeline: { label: 'Pipeline menus', icon: '🍽️' },
  active_alerts: { label: 'Alertes système', icon: '🔔' },
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'pass': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'fail': return <XCircle className="h-5 w-5 text-red-500" />;
    case 'warn': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default: return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
    pass: 'default',
    fail: 'destructive',
    warn: 'secondary',
  };
  return <Badge variant={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
}

function CheckCard({ result }: { result: HealthCheckResult }) {
  const [isOpen, setIsOpen] = useState(false);
  const info = CHECK_LABELS[result.name] || { label: result.name, icon: '🔍' };

  return (
    <Card className={`border-l-4 ${
      result.status === 'pass' ? 'border-l-green-500' :
      result.status === 'fail' ? 'border-l-red-500' : 'border-l-yellow-500'
    }`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon status={result.status} />
                <div>
                  <CardTitle className="text-base font-medium">
                    {info.icon} {info.label}
                  </CardTitle>
                  <CardDescription className="text-sm">{result.message}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{result.duration_ms}ms</span>
                <StatusBadge status={result.status} />
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {result.details && Object.keys(result.details).length > 0 && (
              <div className="bg-muted rounded-md p-3 overflow-x-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function AdminHealth() {
  const { runHealthCheck, isRunning, lastResult, alertsQuery } = useHealthCheck();

  const handleRunAll = () => {
    runHealthCheck.mutate(undefined);
  };

  const overallStatus = lastResult?.status;
  const alerts = alertsQuery.data || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Health Check</h1>
          </div>
          <p className="text-muted-foreground">
            Vérification complète de l'état de santé de la plateforme NutriZen.
          </p>
        </div>

        {/* Summary bar */}
        {lastResult && (
          <Card className={`mb-6 border-2 ${
            overallStatus === 'pass' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' :
            overallStatus === 'fail' ? 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20' :
            'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <StatusIcon status={overallStatus || 'pass'} />
                  <div>
                    <p className="font-semibold text-lg">
                      {overallStatus === 'pass' ? 'Système sain' :
                       overallStatus === 'fail' ? 'Problèmes détectés' : 'Avertissements'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lastResult.summary.pass} ✅ {lastResult.summary.warn} ⚠️ {lastResult.summary.fail} ❌
                      — {format(new Date(lastResult.run_at), 'dd MMM HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
                <StatusBadge status={overallStatus || 'pass'} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active alerts */}
        {alerts.length > 0 && (
          <Card className="mb-6 border-yellow-500/50">
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-base">Alertes actives ({alerts.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert: { id: string; severity: string; message: string; alert_type: string; created_at: string }) => (
                  <div key={alert.id} className="flex items-center gap-3 p-2 rounded bg-muted">
                    <Badge variant={alert.severity === 'critical' || alert.severity === 'error' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                    <span className="text-sm flex-1">{alert.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(alert.created_at), 'dd/MM HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Run button */}
        <div className="mb-6">
          <Button onClick={handleRunAll} disabled={isRunning} size="lg">
            {isRunning ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Vérification en cours...</>
            ) : (
              <><Shield className="mr-2 h-5 w-5" />Lancer tous les checks</>
            )}
          </Button>
        </div>

        {/* Results */}
        {isRunning && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Exécution des vérifications...</p>
          </div>
        )}

        {!isRunning && lastResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lastResult.checks.map((check) => (
              <CheckCard key={check.name} result={check} />
            ))}
          </div>
        )}

        {!isRunning && !lastResult && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Cliquez sur "Lancer tous les checks" pour démarrer.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <AppFooter />
    </div>
  );
}

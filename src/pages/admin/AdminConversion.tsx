import { useState } from 'react';
import { AppFooter } from '@/components/app/AppFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminConversionFunnel } from '@/hooks/useAdminStats';
import { 
  UserPlus, 
  ClipboardCheck, 
  CalendarDays, 
  CreditCard,
  ArrowLeft,
  RefreshCw,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminConversion() {
  const [period, setPeriod] = useState('30');

  const dateFrom = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const dateTo = new Date().toISOString().split('T')[0];

  const { data: stats, isLoading, refetch } = useAdminConversionFunnel(dateFrom, dateTo);

  const funnelSteps = [
    {
      label: 'Inscriptions',
      value: stats?.signups || 0,
      icon: UserPlus,
      color: 'text-blue-500',
    },
    {
      label: 'Onboarding complété',
      value: stats?.onboarding_completed || 0,
      icon: ClipboardCheck,
      color: 'text-green-500',
      conversion: stats?.conversion_signup_to_onboarding,
    },
    {
      label: 'Premier menu',
      value: stats?.first_menu_generated || 0,
      icon: CalendarDays,
      color: 'text-purple-500',
      conversion: stats?.conversion_onboarding_to_menu,
    },
    {
      label: 'Premier achat',
      value: stats?.first_credit_purchase || 0,
      icon: CreditCard,
      color: 'text-amber-500',
    },
  ];

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
              <h1 className="text-3xl font-bold">Funnel de Conversion</h1>
              <p className="text-muted-foreground">
                Parcours utilisateur: inscription → achat
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

        {/* Visual Funnel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Funnel de conversion
            </CardTitle>
            <CardDescription>
              Période: {period} derniers jours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-between gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-1 flex items-center gap-2">
                    <div className="flex-1">
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                    {i < 3 && <Skeleton className="h-6 w-6" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                {funnelSteps.map((step, index) => (
                  <div key={step.label} className="flex-1 flex items-center gap-2">
                    <Card 
                      className="flex-1 p-4 text-center border-2 hover:border-primary/50 transition-colors"
                      style={{
                        opacity: step.value > 0 ? 1 : 0.5,
                      }}
                    >
                      <step.icon className={`h-8 w-8 mx-auto mb-2 ${step.color}`} />
                      <p className="text-2xl font-bold">{step.value}</p>
                      <p className="text-xs text-muted-foreground">{step.label}</p>
                      {step.conversion !== undefined && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {step.conversion}% conv.
                        </Badge>
                      )}
                    </Card>
                    {index < funnelSteps.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Taux global</p>
            <p className="text-3xl font-bold text-primary">
              {stats?.signups && stats.first_credit_purchase
                ? ((stats.first_credit_purchase / stats.signups) * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Inscription → Premier achat
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Drop-off principal</p>
            <p className="text-3xl font-bold text-amber-500">
              {stats?.signups && stats.onboarding_completed
                ? (100 - stats.conversion_signup_to_onboarding).toFixed(1)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Inscriptions sans onboarding
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Utilisateurs engagés</p>
            <p className="text-3xl font-bold text-green-500">
              {stats?.first_menu_generated || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ont généré au moins 1 menu
            </p>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

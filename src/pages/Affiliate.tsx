import { useState, useEffect } from 'react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Users,
  Euro,
  TrendingUp,
  Copy,
  Check,
  Target,
  BarChart3,
  Loader2,
  Rocket,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

interface Commission {
  id: string;
  stripe_invoice_id: string;
  subscription_amount_cents: number;
  commission_amount_cents: number;
  status: string;
  created_at: string;
  referred_user_id: string;
}

function anonymizeUserId(userId: string): string {
  return userId.slice(0, 3) + '***';
}

type ProgramState = 'anonymous' | 'loading' | 'not_enrolled' | 'active' | 'inactive';

export default function Affiliate() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [programState, setProgramState] = useState<ProgramState>('loading');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activeConversions, setActiveConversions] = useState(0);
  const [monthlyCommission, setMonthlyCommission] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingPayout, setPendingPayout] = useState(0);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  useEffect(() => {
    // CRITICAL: wait for auth to fully resolve before deciding state
    if (authLoading) {
      setProgramState('loading');
      return;
    }
    if (!user) {
      setProgramState('anonymous');
      // Reset any stale data from a previous session
      setAffiliateCode('');
      setActiveConversions(0);
      setMonthlyCommission(0);
      setTotalEarnings(0);
      setPendingPayout(0);
      setCommissions([]);
      return;
    }
    checkEnrollment();
  }, [user, authLoading]);

  const checkEnrollment = async () => {
    if (!user) return;
    setProgramState('loading');
    try {
      const db = supabase as any;
      const { data: existing } = await db
        .from('affiliates')
        .select('affiliate_code, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        setProgramState('not_enrolled');
        return;
      }

      if (!existing.is_active) {
        setProgramState('inactive');
        setAffiliateCode(existing.affiliate_code);
        return;
      }

      setAffiliateCode(existing.affiliate_code);
      await loadStats(existing.affiliate_code);
      setProgramState('active');
    } catch (error) {
      console.error('Error checking affiliate enrollment:', error);
      setProgramState('not_enrolled');
    }
  };

  const handleActivate = async () => {
    if (!user) return;
    setActivating(true);
    try {
      const db = supabase as any;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'AFF';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { error } = await db.from('affiliates').insert({
        user_id: user.id,
        affiliate_code: code,
      });

      if (error) {
        if (error.code === '23505') {
          let code2 = 'AFF';
          for (let i = 0; i < 8; i++) {
            code2 += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          await db.from('affiliates').insert({
            user_id: user.id,
            affiliate_code: code2,
          });
          code = code2;
        } else {
          throw error;
        }
      }

      toast.success('Programme activé ! Votre lien est prêt.');
      setAffiliateCode(code);
      setProgramState('active');
    } catch (error) {
      console.error('Error activating affiliate:', error);
      toast.error("Erreur lors de l'activation");
    } finally {
      setActivating(false);
    }
  };

  const loadStats = async (code: string) => {
    const db = supabase as any;

    const { data: referrals } = await db
      .from('affiliate_referrals')
      .select('id')
      .eq('affiliate_code', code)
      .eq('converted', true);

    setActiveConversions(referrals?.length || 0);

    const { data: allCommissions } = await db
      .from('affiliate_commissions')
      .select('*')
      .eq('affiliate_code', code)
      .order('created_at', { ascending: false });

    if (allCommissions) {
      setCommissions(allCommissions as Commission[]);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthly = allCommissions
        .filter((c: any) => c.status === 'pending' && c.created_at >= monthStart)
        .reduce((sum: number, c: any) => sum + c.commission_amount_cents, 0);
      setMonthlyCommission(monthly / 100);

      const total = allCommissions.reduce(
        (sum: number, c: any) => sum + c.commission_amount_cents,
        0
      );
      setTotalEarnings(total / 100);

      const pending = allCommissions
        .filter((c: any) => c.status === 'pending')
        .reduce((sum: number, c: any) => sum + c.commission_amount_cents, 0);
      setPendingPayout(pending / 100);
    }
  };

  const copyAffiliateLink = async () => {
    const link = `https://mynutrizen.fr/?ref=${affiliateCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  // --- LOADING ---
  if (programState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header onCtaClick={() => navigate('/auth/signup')} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => navigate('/auth/signup')} />

      {/* Auth-aware banner for authenticated users */}
      {user && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="container px-4 py-2 flex items-center justify-between">
            <p className="text-sm text-foreground">
              Connecté en tant que <span className="font-medium">{user.email}</span>
            </p>
            <Link to="/app/dashboard">
              <Button variant="ghost" size="sm" className="text-xs">
                Mon espace →
              </Button>
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1 py-12 md:py-20">
        <div className="container px-4">
          {/* Hero */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Programme de Recommandation NutriZen
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6">
              Gagnez jusqu'à{' '}
              <span className="font-bold text-primary">20 % de commission récurrente</span> sur
              chaque abonnement payé
            </p>

            {/* CTA based on state — ANONYMOUS */}
            {programState === 'anonymous' && (
              <div className="space-y-3">
                <Button size="lg" onClick={() => navigate('/auth/signup')}>
                  <Rocket className="h-5 w-5 mr-2" />
                  Créer un compte pour rejoindre le programme
                </Button>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>Déjà un compte ?</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => navigate('/auth/login')}
                  >
                    <LogIn className="h-4 w-4 mr-1" />
                    Se connecter
                  </Button>
                </div>
              </div>
            )}

            {/* CTA — NOT ENROLLED */}
            {programState === 'not_enrolled' && (
              <div className="space-y-3">
                <Button size="lg" onClick={handleActivate} disabled={activating}>
                  {activating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Activation en cours…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5 mr-2" />
                      Activer mon programme de recommandation
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Vous recevrez votre lien unique immédiatement après activation
                </p>
              </div>
            )}

            {/* INACTIVE */}
            {programState === 'inactive' && (
              <Card className="max-w-md mx-auto p-6 bg-destructive/5 border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  Votre programme a été désactivé. Contactez le support pour plus d'informations.
                </p>
              </Card>
            )}
          </div>

          {/* How it works — always visible */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/5 to-accent/5">
              <h2 className="text-2xl font-semibold mb-4">Comment ça marche ?</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Le programme de recommandation NutriZen vous permet de gagner des commissions en €
                  en recommandant notre service.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">1. Activez le programme</h3>
                    <p className="text-sm">Créez votre compte et activez votre lien unique</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">2. Partagez</h3>
                    <p className="text-sm">Recommandez NutriZen via votre lien personnel</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Euro className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">3. Gagnez</h3>
                    <p className="text-sm">Recevez 20 % de commission récurrente en €</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Active dashboard — ONLY for programState === 'active' */}
          {programState === 'active' && affiliateCode && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Affiliate Link */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Votre lien de recommandation</h2>
                <div className="flex gap-2">
                  <Input
                    value={`https://mynutrizen.fr/?ref=${affiliateCode}`}
                    readOnly
                    className="font-mono text-xs md:text-sm"
                  />
                  <Button
                    onClick={copyAffiliateLink}
                    size="icon"
                    variant="outline"
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Partagez ce lien — vous gagnez 20 % sur chaque abonnement payé via ce lien
                </p>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Conversions actives</p>
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{activeConversions}</p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Commission mensuelle</p>
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    {monthlyCommission.toFixed(2)} €
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Ce mois-ci (en attente)</p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Gains totaux</p>
                    <Euro className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">{totalEarnings.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground mt-1">Depuis le début</p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">En attente de paiement</p>
                    <BarChart3 className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-3xl font-bold text-accent">{pendingPayout.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground mt-1">À verser</p>
                </Card>
              </div>

              {/* Commission Info */}
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
                <h3 className="font-semibold mb-3">Conditions de commission</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>
                      Vous gagnez <strong className="text-foreground">20 % de commission</strong>{' '}
                      sur chaque abonnement payé via votre lien
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>
                      La commission est <strong className="text-foreground">récurrente</strong> :
                      vous continuez à gagner tant que l'abonnement reste actif
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Paiements mensuels via virement bancaire (minimum 50 €)</span>
                  </li>
                </ul>
              </Card>

              {/* Commission History */}
              {commissions.length > 0 && (
                <Card className="p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-semibold mb-4">
                    Historique des commissions
                  </h3>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Abonné</TableHead>
                          <TableHead className="text-right">Montant abonnement</TableHead>
                          <TableHead className="text-right">Commission (20 %)</TableHead>
                          <TableHead className="text-right">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              {new Date(c.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {anonymizeUserId(c.referred_user_id)}
                            </TableCell>
                            <TableCell className="text-right">
                              {(c.subscription_amount_cents / 100).toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">
                              {(c.commission_amount_cents / 100).toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  c.status === 'paid'
                                    ? 'default'
                                    : c.status === 'rejected'
                                      ? 'destructive'
                                      : 'secondary'
                                }
                                className={
                                  c.status === 'paid'
                                    ? 'bg-primary text-primary-foreground'
                                    : c.status === 'rejected'
                                      ? ''
                                      : 'bg-accent/10 text-accent border-accent/30'
                                }
                              >
                                {c.status === 'paid'
                                  ? 'Payé'
                                  : c.status === 'rejected'
                                    ? 'Rejeté'
                                    : 'En attente'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile card list */}
                  <div className="md:hidden space-y-3">
                    {commissions.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-lg border border-border bg-muted/30 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <Badge
                            variant={
                              c.status === 'paid'
                                ? 'default'
                                : c.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className={
                              c.status === 'paid'
                                ? 'bg-primary text-primary-foreground'
                                : c.status === 'rejected'
                                  ? ''
                                  : 'bg-accent/10 text-accent border-accent/30'
                            }
                          >
                            {c.status === 'paid'
                              ? 'Payé'
                              : c.status === 'rejected'
                                ? 'Rejeté'
                                : 'En attente'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Abonnement</span>
                          <span className="text-sm font-medium">
                            {(c.subscription_amount_cents / 100).toFixed(2)} €
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Commission (20 %)</span>
                          <span className="text-sm font-bold text-primary">
                            {(c.commission_amount_cents / 100).toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Benefits — visible for anonymous and not_enrolled */}
          {(programState === 'anonymous' || programState === 'not_enrolled') && (
            <div className="max-w-4xl mx-auto mt-12">
              <h2 className="text-2xl font-semibold text-center mb-8">
                Pourquoi rejoindre le programme ?
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Euro className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Commissions récurrentes</h3>
                  <p className="text-sm text-muted-foreground">
                    20 % de chaque abonnement, chaque mois, aussi longtemps qu'il reste actif
                  </p>
                </Card>

                <Card className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Produit qui cartonne</h3>
                  <p className="text-sm text-muted-foreground">
                    NutriZen aide déjà les familles à mieux manger
                  </p>
                </Card>

                <Card className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Simple & transparent</h3>
                  <p className="text-sm text-muted-foreground">
                    Tableau de bord clair, suivi en temps réel, paiements automatiques
                  </p>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

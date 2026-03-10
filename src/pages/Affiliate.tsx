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
  Gift,
  Target,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string;
  stripe_invoice_id: string;
  subscription_amount_cents: number;
  commission_amount_cents: number;
  status: string;
  created_at: string;
  referred_user_id: string;
}

function generateAffiliateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'AFF';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function anonymizeUserId(userId: string): string {
  return userId.slice(0, 3) + '***';
}

export default function Affiliate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [affiliateCode, setAffiliateCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeConversions, setActiveConversions] = useState(0);
  const [monthlyCommission, setMonthlyCommission] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingPayout, setPendingPayout] = useState(0);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  useEffect(() => {
    if (user) {
      initAffiliate();
    } else {
      setLoading(false);
    }
  }, [user]);

  const initAffiliate = async () => {
    if (!user) return;
    try {
      const db = supabase as any;

      const { data: existing } = await db
        .from('affiliates')
        .select('affiliate_code, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      let code: string;
      if (existing) {
        code = existing.affiliate_code;
      } else {
        code = generateAffiliateCode();
        const { error } = await db.from('affiliates').insert({
          user_id: user.id,
          affiliate_code: code,
        });
        if (error) {
          if (error.code === '23505') {
            code = generateAffiliateCode();
            await db.from('affiliates').insert({
              user_id: user.id,
              affiliate_code: code,
            });
          } else {
            throw error;
          }
        }
      }

      setAffiliateCode(code);
      await loadStats(code);
    } catch (error) {
      console.error('Error initializing affiliate:', error);
    } finally {
      setLoading(false);
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

      const total = allCommissions.reduce((sum: number, c: any) => sum + c.commission_amount_cents, 0);
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

  if (loading) {
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

      <main className="flex-1 py-12 md:py-20">
        <div className="container px-4">
          {/* Hero */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Programme d'Affiliation NutriZen
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6">
              Gagne jusqu'à <span className="font-bold text-primary">20% de commission</span> sur chaque abonnement payé
            </p>
            {!user && (
              <Button size="lg" onClick={() => navigate('/auth/login')}>
                Se connecter pour commencer
              </Button>
            )}
          </div>

          {/* How it works */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/5 to-accent/5">
              <h2 className="text-2xl font-semibold mb-4">Comment ça marche ?</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Le programme d'affiliation NutriZen te permet de gagner des commissions en €
                  en recommandant notre service à ton audience.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">1. Inscris-toi</h3>
                    <p className="text-sm">Deviens affilié en un clic et reçois ton lien unique</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">2. Partage</h3>
                    <p className="text-sm">Recommande NutriZen à ton audience via ton lien</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Euro className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">3. Gagne</h3>
                    <p className="text-sm">Reçois 20% de commission récurrente en €</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Difference with referral */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold mb-3">Différence avec le parrainage</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-4 w-4 text-accent" />
                    <span className="font-medium">Parrainage (utilisateurs)</span>
                  </div>
                  <ul className="text-muted-foreground space-y-1 ml-6">
                    <li>• Récompenses en mois gratuits</li>
                    <li>• Récompenses en Crédits Zen</li>
                    <li>• Pour tous les utilisateurs</li>
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Euro className="h-4 w-4 text-primary" />
                    <span className="font-medium">Affiliation (partenaires)</span>
                  </div>
                  <ul className="text-muted-foreground space-y-1 ml-6">
                    <li>• Commission de <strong>20%</strong> en €</li>
                    <li>• Récurrente tant que l'abonnement est actif</li>
                    <li>• Pour créateurs de contenu & partenaires</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Dashboard (logged in) */}
          {user && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Affiliate Link */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Ton lien d'affiliation</h2>
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
                  Partage ce lien avec ton audience pour commencer à gagner des commissions
                </p>
              </Card>

              {/* Stats */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <p className="text-3xl font-bold text-primary">{monthlyCommission.toFixed(2)}€</p>
                  <p className="text-xs text-muted-foreground mt-1">Ce mois-ci (en attente)</p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Gains totaux</p>
                    <Euro className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">{totalEarnings.toFixed(2)}€</p>
                  <p className="text-xs text-muted-foreground mt-1">Tous les temps</p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">En attente de paiement</p>
                    <BarChart3 className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-3xl font-bold text-accent">{pendingPayout.toFixed(2)}€</p>
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
                      Tu gagnes <strong className="text-foreground">20% de commission</strong> sur
                      chaque abonnement payé via ton lien
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>
                      La commission est <strong className="text-foreground">récurrente</strong> :
                      tu continues à gagner tant que l'abonnement reste actif
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>
                      Paiements mensuels via virement bancaire (minimum 50€)
                    </span>
                  </li>
                </ul>
              </Card>

              {/* Commission History */}
              {commissions.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Historique des commissions</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Abonné</TableHead>
                          <TableHead className="text-right">Montant abonnement</TableHead>
                          <TableHead className="text-right">Commission (20%)</TableHead>
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
                              {(c.subscription_amount_cents / 100).toFixed(2)}€
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">
                              {(c.commission_amount_cents / 100).toFixed(2)}€
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={c.status === 'paid' ? 'default' : 'secondary'}
                                className={
                                  c.status === 'paid'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-accent/10 text-accent border-accent/30'
                                }
                              >
                                {c.status === 'paid' ? 'Payé' : 'En attente'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Benefits for non-logged-in */}
          {!user && (
            <div className="max-w-4xl mx-auto mt-12">
              <h2 className="text-2xl font-semibold text-center mb-8">
                Pourquoi devenir affilié NutriZen ?
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Euro className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Commissions récurrentes</h3>
                  <p className="text-sm text-muted-foreground">
                    20% de chaque abonnement, chaque mois, aussi longtemps qu'il reste actif
                  </p>
                </Card>

                <Card className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Produit qui cartonne</h3>
                  <p className="text-sm text-muted-foreground">
                    NutriZen aide déjà des milliers de familles à mieux manger
                  </p>
                </Card>

                <Card className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Simple & transparent</h3>
                  <p className="text-sm text-muted-foreground">
                    Dashboard clair, tracking en temps réel, paiements automatiques
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

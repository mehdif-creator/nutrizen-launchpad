import { useState, useEffect } from 'react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Euro, 
  TrendingUp, 
  Copy, 
  Check, 
  Sparkles,
  Gift,
  Target,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AffiliateStats {
  activeConversions: number;
  monthlyCommission: number;
  totalEarnings: number;
  pendingPayouts: number;
}

export default function Affiliate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<AffiliateStats>({
    activeConversions: 0,
    monthlyCommission: 0,
    totalEarnings: 0,
    pendingPayouts: 0,
  });

  useEffect(() => {
    if (user) {
      loadAffiliateData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadAffiliateData = async () => {
    if (!user) return;

    try {
      // Check if user is affiliate
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_affiliate, affiliate_code')
        .eq('id', user.id)
        .single();

      if (profile) {
        setIsAffiliate(profile.is_affiliate);
        setAffiliateCode(profile.affiliate_code || '');

        if (profile.is_affiliate) {
          // Load affiliate stats
          const { data: conversions } = await supabase
            .from('affiliate_conversions')
            .select('amount_recurring, status')
            .eq('affiliate_user_id', user.id);

          const activeConversions = conversions?.filter(c => c.status === 'active').length || 0;
          const monthlyCommission = conversions
            ?.filter(c => c.status === 'active')
            .reduce((sum, c) => sum + (c.amount_recurring * 0.04), 0) || 0;

          const { data: payouts } = await supabase
            .from('affiliate_payouts')
            .select('amount, status')
            .eq('affiliate_user_id', user.id);

          const totalEarnings = payouts?.reduce((sum, p) => sum + p.amount, 0) || 0;
          const pendingPayouts = payouts?.filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + p.amount, 0) || 0;

          setStats({
            activeConversions,
            monthlyCommission,
            totalEarnings,
            pendingPayouts,
          });
        }
      }
    } catch (error) {
      console.error('Error loading affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const becomeAffiliate = async () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    try {
      // Generate affiliate code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_affiliate_code');

      if (codeError) throw codeError;

      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          is_affiliate: true,
          affiliate_code: codeData,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setIsAffiliate(true);
      setAffiliateCode(codeData);
      toast.success('Bienvenue dans le programme d\'affiliation !');
      loadAffiliateData();
    } catch (error) {
      console.error('Error becoming affiliate:', error);
      toast.error('Erreur lors de l\'inscription au programme');
    }
  };

  const copyAffiliateLink = async () => {
    const link = `${window.location.origin}/?aff=${affiliateCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => navigate('/auth/signup')} />
      
      <main className="flex-1 py-12 md:py-20">
        <div className="container px-4">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Programme d'Affiliation NutriZen
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6">
              Gagne jusqu'à 4% de commission sur chaque abonnement payé
            </p>
            {!user && (
              <Button size="lg" onClick={() => navigate('/auth/login')}>
                Se connecter pour commencer
              </Button>
            )}
          </div>

          {/* What is it */}
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
                    <p className="text-sm">Reçois 4% de commission récurrente en €</p>
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
                    <Euro className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Affiliation (partenaires)</span>
                  </div>
                  <ul className="text-muted-foreground space-y-1 ml-6">
                    <li>• Commission de 4% en €</li>
                    <li>• Récurrente tant que l'abonnement est actif</li>
                    <li>• Pour créateurs de contenu & partenaires</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Affiliate Dashboard or CTA */}
          {user && (
            <div className="max-w-4xl mx-auto">
              {!isAffiliate ? (
                <Card className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Devenir affilié(e)</h2>
                  <p className="text-muted-foreground mb-6">
                    Rejoins notre programme et commence à gagner des commissions dès aujourd'hui
                  </p>
                  <Button size="lg" onClick={becomeAffiliate} disabled={loading}>
                    {loading ? 'Chargement...' : 'Devenir affilié(e)'}
                  </Button>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Affiliate Link */}
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Ton lien d'affiliation</h2>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/?aff=${affiliateCode}`}
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
                          <Check className="h-4 w-4 text-green-500" />
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
                      <p className="text-3xl font-bold">{stats.activeConversions}</p>
                    </Card>

                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Commission mensuelle</p>
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-3xl font-bold">{stats.monthlyCommission.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground mt-1">Estimation récurrente</p>
                    </Card>

                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Gains totaux</p>
                        <Euro className="h-5 w-5 text-accent" />
                      </div>
                      <p className="text-3xl font-bold">{stats.totalEarnings.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground mt-1">Tous les temps</p>
                    </Card>

                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">En attente</p>
                        <BarChart3 className="h-5 w-5 text-amber-600" />
                      </div>
                      <p className="text-3xl font-bold">{stats.pendingPayouts.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground mt-1">À verser</p>
                    </Card>
                  </div>

                  {/* Commission Info */}
                  <Card className="p-6 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                    <h3 className="font-semibold mb-3">Conditions de commission</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>
                          Tu gagnes <strong className="text-foreground">4% de commission</strong> sur 
                          chaque abonnement payé via ton lien
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>
                          La commission est <strong className="text-foreground">récurrente</strong> : 
                          tu continues à gagner tant que l'abonnement reste actif
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>
                          Paiements mensuels via virement bancaire (minimum 50€)
                        </span>
                      </li>
                    </ul>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Benefits for non-affiliates */}
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
                    4% de chaque abonnement, chaque mois, aussi longtemps qu'il reste actif
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

import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Share2, Users, Euro, TrendingUp, MousePointerClick, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Referral() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Affiliate data (unified commission model)
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(true);
  const [affiliateActive, setAffiliateActive] = useState(false);
  const [activating, setActivating] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [commissionStats, setCommissionStats] = useState({
    conversions: 0,
    monthlyCommission: 0,
    totalEarnings: 0,
    pendingPayout: 0,
  });

  useEffect(() => {
    if (user) loadAffiliateData();
  }, [user]);

  const loadAffiliateData = async () => {
    if (!user) return;
    setAffiliateLoading(true);
    try {
      const db = supabase as any;
      const { data: existing } = await db
        .from('affiliates')
        .select('affiliate_code, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setAffiliateCode(existing.affiliate_code);
        setAffiliateActive(existing.is_active);

        if (existing.is_active) {
          // Load referral clicks
          const { data: referralClicks } = await db
            .from('affiliate_referrals')
            .select('id')
            .eq('affiliate_code', existing.affiliate_code);
          setClicks(referralClicks?.length || 0);

          // Load converted referrals
          const { data: referrals } = await db
            .from('affiliate_referrals')
            .select('id')
            .eq('affiliate_code', existing.affiliate_code)
            .eq('converted', true);

          const { data: allCommissions } = await db
            .from('affiliate_commissions')
            .select('*')
            .eq('affiliate_code', existing.affiliate_code);

          const conversions = referrals?.length || 0;
          let monthly = 0, total = 0, pending = 0;

          if (allCommissions) {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            monthly = allCommissions
              .filter((c: any) => c.status === 'pending' && c.created_at >= monthStart)
              .reduce((sum: number, c: any) => sum + c.commission_amount_cents, 0) / 100;
            total = allCommissions.reduce((sum: number, c: any) => sum + c.commission_amount_cents, 0) / 100;
            pending = allCommissions
              .filter((c: any) => c.status === 'pending')
              .reduce((sum: number, c: any) => sum + c.commission_amount_cents, 0) / 100;
          }

          setCommissionStats({ conversions, monthlyCommission: monthly, totalEarnings: total, pendingPayout: pending });
        }
      }
    } catch (error) {
      console.error('Error loading affiliate data:', error);
    } finally {
      setAffiliateLoading(false);
    }
  };

  const handleActivateAffiliate = async () => {
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

      if (error && error.code === '23505') {
        let code2 = 'AFF';
        for (let i = 0; i < 8; i++) {
          code2 += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        await db.from('affiliates').insert({ user_id: user.id, affiliate_code: code2 });
        code = code2;
      } else if (error) {
        throw error;
      }

      toast.success('Programme activé !');
      setAffiliateCode(code);
      setAffiliateActive(true);
    } catch (error) {
      console.error('Error activating affiliate:', error);
      toast.error("Erreur lors de l'activation");
    } finally {
      setActivating(false);
    }
  };

  const getReferralUrl = (page: string = '') => {
    return `${window.location.origin}${page}?ref=${affiliateCode || ''}`;
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error('Erreur lors de la copie'));
  };

  const shareOnSocial = (platform: string) => {
    const url = getReferralUrl();
    const text = "Découvrez NutriZen, l'assistant qui organise vos repas en 30 secondes ! 🥗";
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
      case 'instagram':
        navigator.clipboard.writeText(url);
        toast.success('Lien copié ! Collez-le dans votre story Instagram. 📸');
        return;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const hasAffiliateCode = !!affiliateCode && affiliateActive;

  if (affiliateLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <Skeleton className="h-8 w-64" />
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
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Programme de Recommandation</h1>
            <p className="text-muted-foreground">
              Partagez NutriZen et gagnez 20 % de commission récurrente sur chaque abonnement payé
            </p>
          </div>

          {/* Activation CTA if not enrolled */}
          {!hasAffiliateCode && (
            <Card className="p-8 text-center space-y-4">
              <Users className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Activez votre programme de recommandation</h2>
              <p className="text-muted-foreground">
                Générez votre lien unique pour commencer à gagner des commissions de 20 % sur chaque abonnement payé via votre lien.
              </p>
              <Button onClick={handleActivateAffiliate} disabled={activating} size="lg">
                {activating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Activation…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5 mr-2" />
                    Activer le programme
                  </>
                )}
              </Button>
            </Card>
          )}

          {/* Commission Stats — shown when affiliate is active */}
          {hasAffiliateCode && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <MousePointerClick className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold">{clicks}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Clics</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold">{commissionStats.conversions}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Conversions</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <Euro className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-primary">{commissionStats.totalEarnings.toFixed(2)} €</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Gains totaux</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-accent" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-accent">{commissionStats.pendingPayout.toFixed(2)} €</p>
                    <p className="text-xs md:text-sm text-muted-foreground">En attente</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Recommendation Links — only for active participants */}
          {hasAffiliateCode && affiliateCode && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Vos liens de recommandation
              </h2>

              <div className="space-y-4">
                {['', '/fit', '/mum'].map((page) => {
                  const label = page === '' ? 'Page principale' : page === '/fit' ? 'Page Fit' : 'Page Mum';
                  const url = getReferralUrl(page);
                  return (
                    <div key={page}>
                      <label className="text-sm font-medium mb-2 block">{label}</label>
                      <div className="flex gap-2">
                        <Input value={url} readOnly className="flex-1 font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(url)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <p className="text-sm font-medium mb-3">Partager sur les réseaux :</p>
                <div className="flex flex-wrap gap-2">
                  {['facebook', 'twitter', 'whatsapp', 'instagram'].map((p) => (
                    <Button key={p} variant="outline" size="sm" onClick={() => shareOnSocial(p)}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* How it works */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <h2 className="text-xl font-semibold mb-4">Comment ça marche ?</h2>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>Activez votre programme et partagez votre lien de recommandation</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span>Votre filleul s'inscrit et souscrit à un abonnement payé</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span>Vous gagnez <strong>20 % de commission récurrente</strong> sur chaque paiement</span>
              </li>
            </ol>
          </Card>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

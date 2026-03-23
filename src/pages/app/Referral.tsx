import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Share2, Users, Gift, TrendingUp, MousePointerClick, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useReferralStats } from '@/hooks/useReferralStats';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Referral() {
  const { user } = useAuth();
  const { data: stats, isLoading, isError, refetch } = useReferralStats();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateCode = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { error } = await supabase.rpc('generate_user_referral_code', {
        p_user_id: user.id,
      });
      if (error) throw error;
      toast.success('Code de parrainage créé !');
      refetch();
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast.error('Impossible de générer le code');
    } finally {
      setGenerating(false);
    }
  };

  const getReferralUrl = (page: string = '') => {
    const baseUrl = window.location.origin;
    return `${baseUrl}${page}?ref=${stats?.referral_code || ''}`;
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
    const text = "Découvre NutriZen, l'assistant qui organise tes repas en 30 secondes ! 🥗";
    
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
        toast.success('Lien copié ! Colle-le dans ta story Instagram. 📸');
        return;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Erreur de chargement</h2>
              <p className="text-muted-foreground">Impossible de charger les données de parrainage.</p>
              <Button onClick={() => refetch()}>Réessayer</Button>
            </Card>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  // No code yet
  if (!stats?.has_code) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Programme de Parrainage</h1>
            <Card className="p-8 text-center space-y-4">
              <Users className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Active ton programme de parrainage</h2>
              <p className="text-muted-foreground">
                Génère ton code unique pour inviter tes amis et gagner des crédits !
              </p>
              <Button onClick={handleGenerateCode} disabled={generating} size="lg">
                {generating ? 'Génération...' : 'Activer le parrainage'}
              </Button>
            </Card>
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
            <h1 className="text-3xl font-bold mb-2">Programme de Parrainage</h1>
            <p className="text-muted-foreground">
              Partage NutriZen avec tes amis et gagne des crédits !
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <MousePointerClick className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                <div>
                  <p className="text-xl md:text-2xl font-bold">{stats.clicks}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Clics</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                <div>
                  <p className="text-xl md:text-2xl font-bold">{stats.signups}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Inscriptions</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-accent" />
                <div>
                  <p className="text-xl md:text-2xl font-bold">{stats.qualified}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Qualifiés</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Gift className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                <div>
                  <p className="text-xl md:text-2xl font-bold">+{stats.total_credits_earned}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Crédits gagnés</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Status context */}
          {stats.clicks > 0 && stats.signups === 0 && (
            <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                ⏳ Des clics ont été enregistrés mais aucune inscription n'a encore abouti.
              </p>
            </Card>
          )}

          {/* Referral Links */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Tes liens de parrainage
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

          {/* How it works */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <h2 className="text-xl font-semibold mb-4">Comment ça marche ?</h2>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>Partage ton lien de parrainage avec tes amis</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span>Ton ami s'inscrit et souscrit à un abonnement</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span>Tu gagnes +10 crédits pour chaque parrainage qualifié !</span>
              </li>
            </ol>
          </Card>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

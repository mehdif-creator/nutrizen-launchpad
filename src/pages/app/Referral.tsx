import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Copy, Share2, Users, Gift, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Referral() {
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string>('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's referral code
    const { data: referralData } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', user.id)
      .is('referred_id', null)
      .single();

    if (referralData) {
      setReferralCode(referralData.referral_code);
    }

    // Get user's referral stats
    const { data: referralStats } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .not('referred_id', 'is', null);

    if (referralStats) {
      setReferrals(referralStats);
    }

    setLoading(false);
  };

  const getReferralUrl = (page: string = '') => {
    const baseUrl = window.location.origin;
    return `${baseUrl}${page}?ref=${referralCode}`;
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copié !',
      description: 'Le lien a été copié dans le presse-papier',
    });
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
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const completedReferrals = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const totalPoints = referrals.filter(r => r.status === 'rewarded').reduce((sum, r) => sum + (r.reward_points || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8">
          <p>Chargement...</p>
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
              Partage NutriZen avec tes amis et gagne des points de fidélité !
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{completedReferrals}</p>
                  <p className="text-sm text-muted-foreground">Parrainages réussis</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{pendingReferrals}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{totalPoints}</p>
                  <p className="text-sm text-muted-foreground">Points gagnés</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Referral Links */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Tes liens de parrainage
            </h2>

            <div className="space-y-4">
              {/* Main Page */}
              <div>
                <label className="text-sm font-medium mb-2 block">Page principale</label>
                <div className="flex gap-2">
                  <Input 
                    value={getReferralUrl()} 
                    readOnly 
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(getReferralUrl())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Fit Page */}
              <div>
                <label className="text-sm font-medium mb-2 block">Page Fit</label>
                <div className="flex gap-2">
                  <Input 
                    value={getReferralUrl('/fit')} 
                    readOnly 
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(getReferralUrl('/fit'))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Mum Page */}
              <div>
                <label className="text-sm font-medium mb-2 block">Page Mum</label>
                <div className="flex gap-2">
                  <Input 
                    value={getReferralUrl('/mum')} 
                    readOnly 
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(getReferralUrl('/mum'))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Partager sur les réseaux sociaux :</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => shareOnSocial('facebook')}>
                  Facebook
                </Button>
                <Button variant="outline" onClick={() => shareOnSocial('twitter')}>
                  Twitter
                </Button>
                <Button variant="outline" onClick={() => shareOnSocial('linkedin')}>
                  LinkedIn
                </Button>
                <Button variant="outline" onClick={() => shareOnSocial('whatsapp')}>
                  WhatsApp
                </Button>
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
                <span>Tu gagnes 5 points de fidélité pour chaque parrainage réussi !</span>
              </li>
            </ol>
          </Card>

          {/* Recent Referrals */}
          {referrals.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Mes parrainages récents</h2>
              <div className="space-y-3">
                {referrals.slice(0, 5).map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm">
                        {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant={
                      referral.status === 'rewarded' ? 'default' :
                      referral.status === 'completed' ? 'secondary' : 
                      'outline'
                    }>
                      {referral.status === 'rewarded' ? 'Récompensé' :
                       referral.status === 'completed' ? 'Complété' :
                       'En attente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

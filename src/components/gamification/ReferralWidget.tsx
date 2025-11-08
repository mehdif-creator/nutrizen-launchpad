import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface ReferralWidgetProps {
  referralCode: string;
  activeReferrals: number;
}

export function ReferralWidget({ referralCode, activeReferrals }: ReferralWidgetProps) {
  const [copied, setCopied] = useState(false);
  
  const referralUrl = `${window.location.origin}?ref=${referralCode}`;
  const progress = (activeReferrals / 5) * 100;
  const remaining = Math.max(0, 5 - activeReferrals);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Lien copié!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Parrainage</h2>
        </div>

        {/* Referral link */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Ton lien de parrainage</label>
          <div className="flex gap-2">
            <Input
              value={referralUrl}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              onClick={handleCopy}
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
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Parrainages actifs</span>
            <span className="font-semibold">{activeReferrals}/5</span>
          </div>
          <Progress value={progress} className="h-2" />
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              Plus que <span className="font-semibold text-foreground">{remaining} parrainages</span> pour +1 mois gratuit!
            </p>
          )}
          {remaining === 0 && (
            <p className="text-xs text-primary font-semibold">
              🎉 Objectif atteint! +1 mois d'abonnement gratuit
            </p>
          )}
        </div>

        {/* Rewards info */}
        <div className="p-3 bg-card rounded-lg border text-sm space-y-1">
          <p className="font-semibold">Récompenses:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• 1 parrainage validé = <span className="text-primary">+10 crédits</span></li>
            <li>• 5 parrainages actifs = <span className="text-primary">+1 mois gratuit</span></li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
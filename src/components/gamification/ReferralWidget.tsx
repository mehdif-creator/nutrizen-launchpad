import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Copy, Check, Euro } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface ReferralWidgetProps {
  referralCode: string;
  activeReferrals: number;
  freeMonthsEarned?: number;
  freeMonthsUsed?: number;
}

export function ReferralWidget({ referralCode, activeReferrals }: ReferralWidgetProps) {
  const [copied, setCopied] = useState(false);

  const referralUrl = `${window.location.origin}?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Recommandation</h2>
          </div>
          <Link to="/app/referral">
            <Button variant="ghost" size="sm" className="text-xs">
              Voir plus
            </Button>
          </Link>
        </div>

        {/* Referral link */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Votre lien de recommandation</label>
          <div className="flex gap-2">
            <Input value={referralUrl} readOnly className="font-mono text-xs" />
            <Button onClick={handleCopy} size="icon" variant="outline" className="flex-shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>{activeReferrals}</strong> filleul{activeReferrals > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Commission info */}
        <div className="p-3 bg-card rounded-lg border text-sm space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="h-4 w-4 text-primary" />
            <p className="font-semibold">Commission de 20 %</p>
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>
              • Chaque abonnement payé via votre lien ={' '}
              <span className="text-primary font-medium">20 % pour vous</span>
            </li>
            <li>
              • Commission <span className="text-primary font-medium">récurrente</span> tant que
              l'abonné reste actif
            </li>
            <li>• Paiement par virement dès 50 €</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

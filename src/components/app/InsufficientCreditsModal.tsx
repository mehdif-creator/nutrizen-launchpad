import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sparkles, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InsufficientCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  required: number;
  feature: string;
}

const featureNames: Record<string, string> = {
  swap: 'changer cette recette',
  inspifrigo: 'utiliser InspiFrigo',
  scanrepas: 'utiliser ScanRepas',
  menu_generation: 'générer un menu',
  substitution: 'trouver une alternative',
};

export function InsufficientCreditsModal({
  open,
  onOpenChange,
  currentBalance,
  required,
  feature,
}: InsufficientCreditsModalProps) {
  const navigate = useNavigate();

  const handleBuyCredits = () => {
    onOpenChange(false);
    navigate('/credits');
  };

  const missing = required - currentBalance;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-xl">
              Crédits insuffisants
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3 pt-2">
            <p>
              Tu n'as pas assez de crédits pour {featureNames[feature] || 'utiliser cette fonctionnalité'}.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ton solde actuel :</span>
                <span className="font-semibold">{currentBalance} crédit{currentBalance !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Crédits nécessaires :</span>
                <span className="font-semibold">{required} crédit{required > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Il te manque :</span>
                <span className="font-bold text-primary">{missing} crédit{missing !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <p className="text-sm">
              Achète un pack de Crédits Zen pour continuer à profiter de toutes les fonctionnalités de NutriZen.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBuyCredits}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Acheter des Crédits Zen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

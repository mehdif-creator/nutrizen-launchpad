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
import { Sparkles, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SpendCreditsConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  cost: number;
  currentBalance: number;
  featureName: string;
  loading?: boolean;
}

export function SpendCreditsConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  cost,
  currentBalance,
  featureName,
  loading = false,
}: SpendCreditsConfirmModalProps) {
  const navigate = useNavigate();
  const newBalance = currentBalance - cost;
  const hasEnough = currentBalance >= cost;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-full ${hasEnough ? 'bg-primary/10' : 'bg-destructive/10'}`}>
              {hasEnough ? (
                <Sparkles className="h-6 w-6 text-primary" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              )}
            </div>
            <AlertDialogTitle className="text-xl">
              {hasEnough ? 'Confirmer l\'utilisation' : 'Crédits insuffisants'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3 pt-2">
            {hasEnough ? (
              <>
                <p>
                  Tu es sur le point d'utiliser <strong>{cost} crédit{cost > 1 ? 's' : ''}</strong> pour{' '}
                  <strong>{featureName}</strong>.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ton solde actuel :</span>
                    <span className="font-semibold">{currentBalance} crédit{currentBalance > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coût :</span>
                    <span className="font-semibold text-primary">-{cost} crédit{cost > 1 ? 's' : ''}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Nouveau solde :</span>
                    <span className="font-bold">{newBalance} crédit{newBalance !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p>
                  Tu n'as pas assez de crédits pour <strong>{featureName}</strong>.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ton solde :</span>
                    <span className="font-semibold">{currentBalance} crédit{currentBalance !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Requis :</span>
                    <span className="font-semibold text-destructive">{cost} crédit{cost > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Il te manque :</span>
                    <span className="font-bold text-destructive">{cost - currentBalance} crédit{(cost - currentBalance) > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          {hasEnough ? (
            <AlertDialogAction
              onClick={onConfirm}
              disabled={loading}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Chargement...' : `Confirmer l'utilisation de ${cost} crédit${cost > 1 ? 's' : ''}`}
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={() => {
                onOpenChange(false);
                navigate('/credits');
              }}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Acheter des Crédits Zen
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

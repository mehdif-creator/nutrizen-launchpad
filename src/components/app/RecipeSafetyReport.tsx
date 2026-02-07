import { useState } from 'react';
import { AlertTriangle, Flag, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecipeSafetyReportProps {
  recipeId: string;
  recipeTitle: string;
  menuId?: string;
  className?: string;
}

/**
 * Component to report a recipe that violates user dietary restrictions
 * Stores report in menu_safety_reports table for admin review
 */
export function RecipeSafetyReport({
  recipeId,
  recipeTitle,
  menuId,
  className,
}: RecipeSafetyReportProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Erreur',
        description: 'Décris le problème avant d\'envoyer.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Erreur',
          description: 'Tu dois être connecté pour signaler un problème.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('menu_safety_reports').insert({
        user_id: user.id,
        recipe_id: recipeId,
        menu_id: menuId || null,
        reason: reason.trim(),
        detected_violations: [], // Will be populated by admin investigation
      });

      if (error) {
        console.error('[RecipeSafetyReport] Insert error:', error);
        throw error;
      }

      setSubmitted(true);
      toast({
        title: 'Signalement envoyé',
        description: 'Merci ! Notre équipe va examiner ta demande.',
      });

      // Close dialog after brief delay
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setReason('');
      }, 2000);

    } catch (error) {
      console.error('[RecipeSafetyReport] Error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le signalement. Réessaie plus tard.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={className}
        >
          <Flag className="h-3.5 w-3.5 mr-1" />
          Signaler
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription>
            Cette recette ne respecte pas tes restrictions alimentaires ?
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Merci pour ton signalement !</p>
            <p className="text-sm text-muted-foreground mt-2">
              Notre équipe va examiner "{recipeTitle}" rapidement.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{recipeTitle}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reason">
                Quel est le problème ?
              </label>
              <Textarea
                id="reason"
                placeholder="Ex: Cette recette contient du jambon alors que j'ai indiqué une allergie au porc..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <DialogClose asChild>
                <Button variant="outline">Annuler</Button>
              </DialogClose>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !reason.trim()}
              >
                {submitting ? 'Envoi...' : 'Envoyer le signalement'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

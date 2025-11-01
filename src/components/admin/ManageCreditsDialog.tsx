import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { manageUserCredits } from '@/actions/adminActions';

interface ManageCreditsDialogProps {
  userId: string;
  userEmail: string;
  currentCredits: number;
  onCreditsUpdated: () => void;
}

export const ManageCreditsDialog = ({ userId, userEmail, currentCredits, onCreditsUpdated }: ManageCreditsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState<'set' | 'add' | 'subtract'>('set');
  const [credits, setCredits] = useState(0);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await manageUserCredits(userId, credits, operation);

      if (result.success) {
        toast({
          title: 'Crédits mis à jour',
          description: `Crédits de ${userEmail}: ${result.data.previous_credits} → ${result.data.new_credits}`,
        });
        setOpen(false);
        setCredits(0);
        onCreditsUpdated();
      } else {
        throw new Error(result.message || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Error managing credits:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de modifier les crédits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPreviewCredits = () => {
    switch (operation) {
      case 'set':
        return credits;
      case 'add':
        return currentCredits + credits;
      case 'subtract':
        return Math.max(0, currentCredits - credits);
      default:
        return currentCredits;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" title="Gérer les crédits">
          <Coins className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gérer les crédits</DialogTitle>
        </DialogHeader>
        <div className="mb-4 p-3 bg-muted rounded-md">
          <p className="text-sm">
            <span className="font-medium">{userEmail}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Crédits actuels: <span className="font-bold">{currentCredits}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="operation">Opération</Label>
            <Select value={operation} onValueChange={(v: any) => setOperation(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set">Définir à</SelectItem>
                <SelectItem value="add">Ajouter</SelectItem>
                <SelectItem value="subtract">Soustraire</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="credits">Nombre de crédits</Label>
            <Input
              id="credits"
              type="number"
              min="0"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
              required
            />
          </div>
          <div className="p-3 bg-primary/10 rounded-md">
            <p className="text-sm">
              Aperçu: <span className="font-bold">{getPreviewCredits()} crédits</span>
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Modification...' : 'Valider'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

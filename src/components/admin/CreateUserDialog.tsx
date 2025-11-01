import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createUser } from '@/actions/adminActions';

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

export const CreateUserDialog = ({ onUserCreated }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [initialCredits, setInitialCredits] = useState(10);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createUser(
        email,
        password || undefined,
        fullName || undefined,
        initialCredits
      );

      if (result.success) {
        toast({
          title: 'Utilisateur créé',
          description: `${email} a été créé avec succès`,
        });
        setOpen(false);
        setEmail('');
        setPassword('');
        setFullName('');
        setInitialCredits(10);
        onUserCreated();
      } else {
        throw new Error(result.message || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de créer l\'utilisateur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Créer un utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="utilisateur@exemple.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe (optionnel)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Laissez vide pour générer automatiquement"
            />
            <p className="text-xs text-muted-foreground">
              Si vide, un mot de passe aléatoire sera généré
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet (optionnel)</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jean Dupont"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="credits">Crédits initiaux</Label>
            <Input
              id="credits"
              type="number"
              min="0"
              value={initialCredits}
              onChange={(e) => setInitialCredits(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

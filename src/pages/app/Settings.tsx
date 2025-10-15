import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const { toast } = useToast();

  const handleStripePortal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le portail de gestion",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = () => {
    toast({
      title: 'Demande enregistrée',
      description: 'Ton compte sera supprimé sous 7 jours.',
      variant: 'destructive',
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Paramètres</h1>
          <p className="text-muted-foreground mb-8">
            Gère ton abonnement et tes préférences
          </p>

          {/* Subscription */}
          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Abonnement actuel</h2>
                <div className="flex items-center gap-3">
                  <Badge className="bg-gradient-to-r from-primary to-accent text-white">
                    Essai gratuit
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Expire le 27 janvier 2025
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Plan</span>
                <span className="font-medium">Gratuit (7 jours)</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Prochaine facturation</span>
                <span className="font-medium">27 janvier 2025</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Swaps mensuels</span>
                <span className="font-medium">10 inclus</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t space-y-3">
              <Button onClick={handleStripePortal} className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Gérer mon abonnement (Stripe)
              </Button>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Télécharger mes factures
              </Button>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Astuces hebdomadaires</p>
                  <p className="text-sm text-muted-foreground">
                    Reçois des conseils chaque semaine
                  </p>
                </div>
                <Button variant="outline" size="sm">Activé</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rappel fin d'essai</p>
                  <p className="text-sm text-muted-foreground">
                    3 jours avant la fin de ton essai
                  </p>
                </div>
                <Button variant="outline" size="sm">Activé</Button>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-destructive">
            <h2 className="text-xl font-semibold mb-4 text-destructive">
              Zone dangereuse
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Cette action est irréversible. Toutes tes données seront supprimées définitivement.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Es-tu absolument sûr(e) ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Ton compte et toutes tes données
                    seront définitivement supprimés de nos serveurs après 7 jours.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive">
                    Oui, supprimer mon compte
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

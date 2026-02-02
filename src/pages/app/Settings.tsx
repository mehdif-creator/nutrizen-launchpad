import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Download, Trash2, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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

      <main className="flex-1 container py-4 md:py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Paramètres</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">
            Gère ton abonnement et tes préférences
          </p>

          {/* Subscription */}
          <Card className="p-4 md:p-6 mb-4 md:mb-6">
            <div className="mb-4">
            <div className="mb-3">
              <h2 className="text-lg md:text-xl font-semibold mb-2">Mon compte</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Badge className="bg-gradient-to-r from-primary to-accent text-white w-fit">
                  Gratuit à vie
                </Badge>
                <span className="text-xs md:text-sm text-muted-foreground">
                  Accès complet aux fonctionnalités de base
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-xs md:text-sm">Plan</span>
              <span className="text-sm md:text-base font-medium">Gratuit à vie</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs md:text-sm">Crédits Zen</span>
              <span className="text-sm md:text-base font-medium">Options premium</span>
            </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs md:text-sm">Swaps mensuels</span>
                <span className="text-sm md:text-base font-medium">10 inclus</span>
              </div>
            </div>

          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t space-y-2 md:space-y-3">
            <Button onClick={handleStripePortal} className="w-full text-sm md:text-base">
              <ExternalLink className="mr-2 h-4 w-4" />
              Gérer mes Crédits Zen
            </Button>
            <p className="text-xs text-muted-foreground">
              Depuis le portail Stripe, tu peux consulter tes achats de crédits 
              et tes factures.
            </p>
          </div>
          </Card>

          {/* Help & Support */}
          <Card className="p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Aide & Support</h2>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/app/support')} 
                variant="outline" 
                className="w-full text-sm md:text-base"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                FAQ & Questions fréquentes
              </Button>
              <p className="text-xs text-muted-foreground">
                Retrouve les réponses aux questions les plus courantes sur l'utilisation de NutriZen, 
                les crédits, le parrainage et la facturation.
              </p>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm md:text-base font-medium">Astuces hebdomadaires</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Reçois des conseils chaque semaine
                  </p>
                </div>
                <Button variant="outline" size="sm" className="whitespace-nowrap">Activé</Button>
              </div>
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm md:text-base font-medium">Nouveaux Crédits Zen</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Quand de nouveaux packs sont disponibles
                </p>
              </div>
              <Button variant="outline" size="sm" className="whitespace-nowrap">Activé</Button>
            </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-4 md:p-6 border-destructive">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-destructive">
              Zone dangereuse
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mb-4">
              Cette action est irréversible. Toutes tes données seront supprimées définitivement.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto text-sm md:text-base">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-base md:text-lg">Es-tu absolument sûr(e) ?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs md:text-sm">
                    Cette action est irréversible. Ton compte et toutes tes données
                    seront définitivement supprimés de nos serveurs après 7 jours.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive w-full sm:w-auto">
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

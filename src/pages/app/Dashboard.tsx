import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ShoppingCart, Star, Clock, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'toi';

  const handleGeneratePlan = () => {
    toast({
      title: '🎉 Menu généré !',
      description: 'Ton menu de la semaine est prêt.',
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Bienvenue, {firstName} ! 👋
          </h1>
          <p className="text-muted-foreground">
            Voici ton tableau de bord NutriZen
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Swaps restants</p>
                <p className="text-2xl font-bold">8/10</p>
              </div>
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recettes notées</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Star className="h-8 w-8 text-accent" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temps gagné</p>
                <p className="text-2xl font-bold">3h</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jours restants</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Weekly Plan */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Semaine en cours</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Liste de courses
              </Button>
              <Button onClick={handleGeneratePlan} size="sm">
                Régénérer la semaine
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(7)].map((_, i) => (
              <Card key={i} className="p-4 hover:shadow-glow transition-all cursor-pointer">
                <div className="aspect-video bg-gradient-to-br from-accent/20 to-primary/20 rounded-lg mb-3" />
                <h3 className="font-semibold mb-1">Jour {i + 1}</h3>
                <p className="text-sm text-muted-foreground mb-2">Poulet au curry</p>
                <p className="text-xs text-muted-foreground mb-3">⏱️ 30 min</p>
                <Button variant="outline" size="sm" className="w-full">
                  Voir la recette
                </Button>
              </Card>
            ))}
          </div>
        </Card>

        {/* Daily Tip */}
        <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/10">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">💡 Astuce du jour</h3>
              <p className="text-muted-foreground">
                Prépare tes légumes le dimanche pour gagner 15 minutes par jour toute la semaine !
              </p>
            </div>
          </div>
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}

import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Download, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MealPlan() {
  const { toast } = useToast();

  const handleExportList = () => {
    toast({
      title: '📥 Liste téléchargée',
      description: 'Ta liste de courses est prête.',
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Ton menu de la semaine</h1>
            <p className="text-muted-foreground">
              Détails de tes repas du 20 au 26 janvier 2025
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportList}>
              <Download className="h-4 w-4 mr-2" />
              Exporter PDF
            </Button>
            <Button onClick={handleExportList}>
              <Mail className="h-4 w-4 mr-2" />
              Envoyer par email
            </Button>
          </div>
        </div>

        {/* Weekly Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Jour</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Petit-déjeuner</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Déjeuner</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Dîner</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium">{day}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      Porridge aux fruits
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      Poulet au curry & riz
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      Salade grecque
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Shopping List */}
        <Card className="p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Liste de courses
            </h2>
            <Button variant="outline" onClick={handleExportList}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-primary">🥬 Légumes & Fruits</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Tomates (6)</li>
                <li>• Concombres (2)</li>
                <li>• Bananes (1 kg)</li>
                <li>• Pommes (4)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-accent">🍖 Viandes & Poissons</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Poulet (800g)</li>
                <li>• Saumon (400g)</li>
                <li>• Œufs (12)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-green-600">🌾 Féculents</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Riz basmati (500g)</li>
                <li>• Pâtes (500g)</li>
                <li>• Pain complet</li>
              </ul>
            </div>
          </div>
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}

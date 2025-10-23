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

      <main className="flex-1 container py-4 md:py-8 px-4">
        <div className="mb-6 md:mb-8">
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Ton menu de la semaine</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Détails de tes repas du 20 au 26 janvier 2025
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleExportList} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Exporter PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button onClick={handleExportList} className="w-full sm:w-auto">
              <Mail className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Envoyer par email</span>
              <span className="sm:hidden">Email</span>
            </Button>
          </div>
        </div>

        {/* Weekly Table */}
        <Card className="overflow-hidden mb-6 md:mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold">Jour</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold hidden sm:table-cell">Petit-déj</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold">Déjeuner</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold">Dîner</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="px-3 md:px-6 py-3 md:py-4 font-medium text-sm md:text-base">{day.slice(0, 3)}<span className="hidden sm:inline">{day.slice(3)}</span></td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-muted-foreground hidden sm:table-cell">
                      Porridge aux fruits
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-muted-foreground">
                      Poulet au curry & riz
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-muted-foreground">
                      Salade grecque
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Shopping List */}
        <Card className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
              Liste de courses
            </h2>
            <Button variant="outline" onClick={handleExportList} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base text-primary">🥬 Légumes & Fruits</h3>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                <li>• Tomates (6)</li>
                <li>• Concombres (2)</li>
                <li>• Bananes (1 kg)</li>
                <li>• Pommes (4)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base text-accent">🍖 Viandes & Poissons</h3>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                <li>• Poulet (800g)</li>
                <li>• Saumon (400g)</li>
                <li>• Œufs (12)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base text-green-600">🌾 Féculents</h3>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
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

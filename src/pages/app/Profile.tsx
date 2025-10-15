import { useState } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

export default function Profile() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [prefs, setPrefs] = useState({
    objectifs: ['equilibre'],
    budget: 'moyen',
    temps: 'rapide',
    personnes: 1,
    allergies: [] as string[],
  });

  const handleSave = async () => {
    setSaving(true);
    
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: '✅ Préférences sauvegardées',
      description: 'Tes préférences ont été mises à jour.',
    });
    
    setSaving(false);
  };

  const toggleAllergie = (allergie: string) => {
    setPrefs(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergie)
        ? prev.allergies.filter(a => a !== allergie)
        : [...prev.allergies, allergie],
    }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Mes préférences</h1>
          <p className="text-muted-foreground mb-8">
            Personnalise tes menus selon tes besoins
          </p>

          <div className="space-y-6">
            {/* Objectifs */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Objectifs</h2>
              <div className="space-y-3">
                {[
                  { id: 'equilibre', label: 'Alimentation équilibrée' },
                  { id: 'perte', label: 'Perte de poids' },
                  { id: 'muscle', label: 'Prise de muscle' },
                  { id: 'energie', label: 'Plus d\'énergie' },
                ].map((obj) => (
                  <div key={obj.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={obj.id}
                      checked={prefs.objectifs.includes(obj.id)}
                      onCheckedChange={() => {
                        setPrefs(prev => ({
                          ...prev,
                          objectifs: prev.objectifs.includes(obj.id)
                            ? prev.objectifs.filter(o => o !== obj.id)
                            : [...prev.objectifs, obj.id],
                        }));
                      }}
                    />
                    <label
                      htmlFor={obj.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {obj.label}
                    </label>
                  </div>
                ))}
              </div>
            </Card>

            {/* Budget */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Budget courses</h2>
              <div className="grid grid-cols-3 gap-3">
                {['serré', 'moyen', 'confortable'].map((budget) => (
                  <Button
                    key={budget}
                    variant={prefs.budget === budget ? 'default' : 'outline'}
                    onClick={() => setPrefs({ ...prefs, budget })}
                  >
                    {budget.charAt(0).toUpperCase() + budget.slice(1)}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Temps de cuisine */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Temps de cuisine</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'rapide', label: '< 30 min' },
                  { id: 'moyen', label: '30-45 min' },
                  { id: 'long', label: '> 45 min' },
                ].map((temps) => (
                  <Button
                    key={temps.id}
                    variant={prefs.temps === temps.id ? 'default' : 'outline'}
                    onClick={() => setPrefs({ ...prefs, temps: temps.id })}
                  >
                    {temps.label}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Allergies */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Allergies et restrictions</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['gluten', 'lactose', 'arachide', 'fruits de mer', 'soja', 'œufs'].map((allergie) => (
                  <div key={allergie} className="flex items-center space-x-2">
                    <Checkbox
                      id={allergie}
                      checked={prefs.allergies.includes(allergie)}
                      onCheckedChange={() => toggleAllergie(allergie)}
                    />
                    <label htmlFor={allergie} className="text-sm">
                      {allergie.charAt(0).toUpperCase() + allergie.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </Card>

            {/* Nombre de personnes */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Nombre de personnes</h2>
              <div className="flex items-center gap-4">
                <Label htmlFor="personnes">Pour combien de personnes ?</Label>
                <Input
                  id="personnes"
                  type="number"
                  min="1"
                  max="10"
                  value={prefs.personnes}
                  onChange={(e) => setPrefs({ ...prefs, personnes: parseInt(e.target.value) || 1 })}
                  className="w-20"
                />
              </div>
            </Card>

            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? 'Sauvegarde...' : 'Sauvegarder mes préférences'}
            </Button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

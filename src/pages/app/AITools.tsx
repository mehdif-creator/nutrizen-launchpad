import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Upload, Camera, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AITools() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photoMacrosResult, setPhotoMacrosResult] = useState<any>(null);
  const [fridgeRecipesResult, setFridgeRecipesResult] = useState<any>(null);

  const handlePhotoToMacros = async (file: File) => {
    setLoading(true);
    setPhotoMacrosResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        const { data, error } = await supabase.functions.invoke('analyze-food-photo', {
          body: { image: base64Image }
        });

        if (error) throw error;

        setPhotoMacrosResult(data);
        toast({
          title: 'Analyse terminée !',
          description: 'Les informations nutritionnelles ont été calculées',
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error analyzing photo:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'analyser la photo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFridgeToRecipes = async (file: File) => {
    setLoading(true);
    setFridgeRecipesResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        const { data, error } = await supabase.functions.invoke('analyze-fridge-photo', {
          body: { image: base64Image }
        });

        if (error) throw error;

        setFridgeRecipesResult(data);
        toast({
          title: 'Recettes générées !',
          description: 'Des recettes ont été créées avec tes ingrédients',
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error analyzing fridge:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'analyser le frigo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">Outils IA Premium</h1>
              <Badge className="bg-gradient-to-r from-primary to-accent">Premium</Badge>
            </div>
            <p className="text-muted-foreground">
              Utilise l'intelligence artificielle pour analyser tes plats et créer des recettes personnalisées
            </p>
          </div>

          {/* Photo to Macros */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Photo → Macros</h2>
                <p className="text-muted-foreground mb-4">
                  Prends une photo de ton plat et obtiens instantanément les valeurs nutritionnelles : calories, protéines, glucides, lipides.
                </p>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handlePhotoToMacros(e.target.files[0])}
                      className="hidden"
                      id="photo-macros-input"
                      disabled={loading}
                    />
                    <label htmlFor="photo-macros-input" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Clique pour sélectionner une photo de ton plat
                      </p>
                    </label>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Analyse en cours...</span>
                    </div>
                  )}

                  {photoMacrosResult && (
                    <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                      <h3 className="font-semibold text-lg">Résultats de l'analyse</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {photoMacrosResult.calories && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{photoMacrosResult.calories}</p>
                            <p className="text-sm text-muted-foreground">Calories</p>
                          </div>
                        )}
                        {photoMacrosResult.protein && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-500">{photoMacrosResult.protein}g</p>
                            <p className="text-sm text-muted-foreground">Protéines</p>
                          </div>
                        )}
                        {photoMacrosResult.carbs && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-500">{photoMacrosResult.carbs}g</p>
                            <p className="text-sm text-muted-foreground">Glucides</p>
                          </div>
                        )}
                        {photoMacrosResult.fats && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-500">{photoMacrosResult.fats}g</p>
                            <p className="text-sm text-muted-foreground">Lipides</p>
                          </div>
                        )}
                      </div>
                      {photoMacrosResult.description && (
                        <p className="text-sm text-muted-foreground">{photoMacrosResult.description}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Fridge to Recipes */}
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-lg bg-accent/10">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Frigo → Recettes</h2>
                <p className="text-muted-foreground mb-4">
                  Prends une photo de ton frigo ou liste tes ingrédients disponibles. L'IA te propose des recettes adaptées !
                </p>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFridgeToRecipes(e.target.files[0])}
                      className="hidden"
                      id="fridge-recipes-input"
                      disabled={loading}
                    />
                    <label htmlFor="fridge-recipes-input" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Clique pour sélectionner une photo de ton frigo
                      </p>
                    </label>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-accent">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Génération des recettes en cours...</span>
                    </div>
                  )}

                  {fridgeRecipesResult && (
                    <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                      <h3 className="font-semibold text-lg">Recettes suggérées</h3>
                      {fridgeRecipesResult.recipes?.map((recipe: any, index: number) => (
                        <div key={index} className="bg-background rounded-lg p-4 space-y-2">
                          <h4 className="font-semibold">{recipe.title}</h4>
                          <p className="text-sm text-muted-foreground">{recipe.description}</p>
                          {recipe.ingredients && (
                            <div>
                              <p className="text-sm font-medium mb-1">Ingrédients :</p>
                              <ul className="text-sm text-muted-foreground list-disc list-inside">
                                {recipe.ingredients.map((ing: string, i: number) => (
                                  <li key={i}>{ing}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

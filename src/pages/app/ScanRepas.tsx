import { useState } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface AnalysisResult {
  food: FoodItem[];
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function ScanRepas() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
    } else {
      toast.error('Veuillez sélectionner une image');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(
        'https://n8n.srv1005117.hstgr.cloud/webhook-test/Nutrizen-analyse-repas',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse');
      }

      const data = await response.json();
      const output = data[0]?.output;

      if (output?.status === 'success' && output.food) {
        setResult({
          food: output.food,
          total: output.total,
        });
        toast.success('Analyse terminée avec succès !');
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (error) {
      console.error('Error analyzing meal:', error);
      toast.error('Erreur lors de l\'analyse. Merci de réessayer.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container py-8 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Analyse ton repas en 1 clic 🍽️
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Prends une photo de ton repas et découvre instantanément ses apports nutritionnels.
          </p>
        </div>

        {!result ? (
          <Card className="shadow-card animate-slide-up">
            <CardContent className="p-8">
              {/* Upload Area */}
              <div className="space-y-6">
                {previewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border-2 border-border">
                    <img 
                      src={previewUrl} 
                      alt="Aperçu" 
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-primary/10 rounded-full">
                        <Camera className="h-12 w-12 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-medium mb-2">Ajoute une photo de ton repas</p>
                        <p className="text-sm text-muted-foreground">
                          Capture ou sélectionne une image depuis ta galerie
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Prendre une photo
                    </Button>
                  </label>

                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choisir un fichier
                    </Button>
                  </label>
                </div>

                {selectedFile && (
                  <Button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyse en cours... 🍃
                      </>
                    ) : (
                      'Analyser mon repas'
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Results Table */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-2xl">Résultats de l'analyse 🍽️</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-semibold">Aliment</th>
                        <th className="text-left py-3 px-2 font-semibold">Quantité</th>
                        <th className="text-right py-3 px-2 font-semibold">Calories</th>
                        <th className="text-right py-3 px-2 font-semibold">Protéines (g)</th>
                        <th className="text-right py-3 px-2 font-semibold">Glucides (g)</th>
                        <th className="text-right py-3 px-2 font-semibold">Lipides (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.food.map((item, index) => (
                        <tr key={index} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-2 font-medium">{item.name}</td>
                          <td className="py-3 px-2 text-muted-foreground">{item.quantity}</td>
                          <td className="py-3 px-2 text-right">{item.calories}</td>
                          <td className="py-3 px-2 text-right">{item.protein}</td>
                          <td className="py-3 px-2 text-right">{item.carbs}</td>
                          <td className="py-3 px-2 text-right">{item.fat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="shadow-card bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Résumé total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Calories totales</p>
                    <p className="text-2xl font-bold text-primary">{result.total.calories}</p>
                  </div>
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Protéines totales</p>
                    <p className="text-2xl font-bold text-accent">{result.total.protein}g</p>
                  </div>
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Glucides totaux</p>
                    <p className="text-2xl font-bold text-warning">{result.total.carbs}g</p>
                  </div>
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Lipides totaux</p>
                    <p className="text-2xl font-bold text-error">{result.total.fat}g</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleReset}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Analyser un autre repas
            </Button>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

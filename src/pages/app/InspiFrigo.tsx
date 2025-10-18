import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Recipe {
  title: string;
  time: string;
  difficulty: string;
  ingredients_used: string[];
  summary: string;
}

interface AnalysisResult {
  ingredients: string[];
  recipes: Recipe[];
}

// Counter animation hook
const useCountUp = (end: number, duration: number = 800, start: number = 0) => {
  const [count, setCount] = useState(start);

  useEffect(() => {
    if (end === start) return;
    
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * (end - start) + start));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration, start]);

  return count;
};

export default function InspiFrigo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
        'https://n8n.srv1005117.hstgr.cloud/webhook-test/analyse-frigo',
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

      if (output?.status === 'success' && output.recipes) {
        setResult({
          ingredients: output.ingredients || [],
          recipes: output.recipes,
        });
        toast.success('Analyse terminée avec succès !');
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (error) {
      console.error('Error analyzing fridge:', error);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
    } else {
      toast.error('Veuillez sélectionner une image');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F9FFF9] to-white">
      <AppHeader />
      
      <main className="flex-1 container py-8 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[hsl(129,38%,56%)] via-[hsl(129,38%,46%)] to-[hsl(23,100%,63%)] bg-clip-text text-transparent">
            Trouve des idées de recettes à partir de ton frigo 🧊
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Prends une photo de ton frigo ou de tes ingrédients, et découvre des recettes adaptées à ce que tu as sous la main.
          </p>
        </div>

        {isAnalyzing ? (
          <Card className="shadow-lg animate-fade-in border-0">
            <CardContent className="p-12">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[hsl(129,38%,56%)] to-white rounded-full blur-xl opacity-50 animate-pulse" />
                  <Loader2 className="h-16 w-16 text-[hsl(129,38%,56%)] animate-spin relative z-10" />
                </div>
                <div>
                  <p className="text-xl font-semibold mb-2">Analyse en cours... 🍃</p>
                  <p className="text-muted-foreground">Prépare-toi à cuisiner !</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !result ? (
          <Card className="shadow-lg animate-slide-up border-0 overflow-hidden" style={{ borderRadius: '1.5rem' }}>
            <CardContent className="p-8">
              {/* Upload Area */}
              <div className="space-y-6">
                {previewUrl ? (
                  <div className="relative rounded-[1.5rem] overflow-hidden border-2 border-border shadow-[rgba(0,0,0,0.05)_2px_2px_5px]">
                    <img 
                      src={previewUrl} 
                      alt="Aperçu" 
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                ) : (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-[1.5rem] p-12 text-center transition-all duration-300 cursor-pointer ${
                      isDragging 
                        ? 'border-[hsl(129,38%,56%)] bg-[hsl(129,38%,56%)]/5 scale-105 shadow-[0_0_20px_rgba(95,178,102,0.3)]' 
                        : 'border-muted-foreground/30 hover:border-[hsl(129,38%,56%)] hover:scale-105 hover:shadow-[0_0_15px_rgba(95,178,102,0.2)]'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gradient-to-br from-[hsl(129,38%,56%)]/10 to-[hsl(23,100%,63%)]/10 rounded-full animate-pulse">
                        <Camera className="h-12 w-12 text-[hsl(129,38%,56%)]" />
                      </div>
                      <div>
                        <p className="text-lg font-medium mb-2">📸 Dépose une photo de ton frigo ici ou prends une photo</p>
                        <p className="text-sm text-muted-foreground">
                          Glisse ton image ou utilise les boutons ci-dessous
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
                    className="w-full bg-gradient-to-r from-[hsl(129,38%,56%)] to-[hsl(23,100%,63%)] hover:opacity-90 text-white shadow-lg transition-all duration-300 hover:scale-105"
                    size="lg"
                    style={{ borderRadius: '1rem' }}
                  >
                    Analyser mon frigo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Detected Ingredients */}
            {result.ingredients && result.ingredients.length > 0 && (
              <Card 
                className="shadow-[rgba(0,0,0,0.05)_2px_2px_5px] border-0"
                style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}
              >
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <span className="text-3xl">🧺</span>
                    Ingrédients détectés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.ingredients.map((ingredient, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gradient-to-r from-[hsl(129,38%,56%)]/10 to-[hsl(23,100%,63%)]/10 rounded-full text-sm font-medium"
                        style={{ animation: `fadeIn 0.5s ease-out ${index * 0.1}s both` }}
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recipe Cards */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center mb-6">
                🍽️ Recettes suggérées
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.recipes.map((recipe, index) => (
                  <Card 
                    key={index} 
                    className="shadow-[rgba(0,0,0,0.05)_2px_2px_5px] border-0 hover:shadow-lg transition-all duration-300 hover:scale-105"
                    style={{ 
                      borderRadius: '1.5rem',
                      animation: `fadeIn 0.5s ease-out ${index * 0.15}s both`
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <h3 className="font-bold text-xl text-[hsl(129,38%,46%)]">
                          🍽️ {recipe.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            ⏱️ <strong>Temps :</strong> {recipe.time}
                          </span>
                          <span className="flex items-center gap-1">
                            🎯 <strong>Difficulté :</strong> {recipe.difficulty}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-1">🧾 Ingrédients utilisés :</p>
                          <p className="text-sm text-muted-foreground">
                            {recipe.ingredients_used.join(', ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-1">🧘‍♀️ Résumé :</p>
                          <p className="text-sm text-muted-foreground">
                            {recipe.summary}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <style>{`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>

            <div className="flex justify-center">
              <Button 
                onClick={handleReset}
                size="lg"
                className="bg-gradient-to-r from-[hsl(23,100%,63%)] to-[hsl(129,38%,56%)] hover:opacity-90 text-white shadow-lg transition-all duration-300 hover:scale-110"
                style={{ borderRadius: '1rem' }}
              >
                🔁 Analyser une autre photo
              </Button>
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

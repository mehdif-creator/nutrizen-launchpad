import { useState, useEffect } from 'react';
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

export default function ScanRepas() {
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

      if (data?.status === 'success' && data.food && data.total) {
        setResult({
          food: data.food,
          total: data.total,
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
            Analyse ton repas en 1 clic 🍽️
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Prends une photo de ton repas et découvre instantanément ses apports nutritionnels.
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
                  <p className="text-muted-foreground">Respire un instant</p>
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
                        <p className="text-lg font-medium mb-2">📸 Dépose ton repas ici ou prends une photo</p>
                        <p className="text-sm text-muted-foreground">
                          Glisse ton image ou utilise les boutons ci-dessous
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="camera-input"
                    />
                    <label htmlFor="camera-input" className="w-full">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        asChild
                      >
                        <span className="cursor-pointer">
                          <Camera className="mr-2 h-4 w-4" />
                          Prendre une photo
                        </span>
                      </Button>
                    </label>
                  </div>

                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="w-full">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        asChild
                      >
                        <span className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          Choisir un fichier
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                {selectedFile && (
                  <Button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-[hsl(129,38%,56%)] to-[hsl(23,100%,63%)] hover:opacity-90 text-white shadow-lg transition-all duration-300 hover:scale-105"
                    size="lg"
                    style={{ borderRadius: '1rem' }}
                  >
                    Analyser mon repas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Food Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.food.map((item, index) => (
                <Card 
                  key={index} 
                  className="shadow-[rgba(0,0,0,0.05)_2px_2px_5px] border-0 hover:shadow-lg transition-all duration-300 hover:scale-105"
                  style={{ 
                    borderRadius: '1.5rem',
                    animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">Quantité : {item.quantity}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔥</span>
                          <span className="text-[hsl(23,100%,63%)] font-semibold">{item.calories} kcal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">💪</span>
                          <span className="text-blue-500 font-semibold">{item.protein} g</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🌾</span>
                          <span className="text-yellow-600 font-semibold">{item.carbs} g</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🥑</span>
                          <span className="text-[hsl(129,38%,56%)] font-semibold">{item.fat} g</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary Card */}
            <SummaryCard total={result.total} />

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
                className="bg-gradient-to-r from-[hsl(23,100%,63%)] to-[hsl(129,38%,56%)] hover:opacity-90 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:animate-bounce"
                style={{ borderRadius: '1rem' }}
              >
                🔁 Analyser un autre repas
              </Button>
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

// Summary Card Component with count-up animation
function SummaryCard({ total }: { total: { calories: number; protein: number; carbs: number; fat: number } }) {
  const calories = useCountUp(total.calories);
  const protein = useCountUp(total.protein);
  const carbs = useCountUp(total.carbs);
  const fat = useCountUp(total.fat);

  return (
    <Card 
      className="shadow-[rgba(0,0,0,0.05)_2px_2px_5px] border-0 overflow-hidden"
      style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out 0.6s both' }}
    >
      <CardHeader className="bg-gradient-to-r from-[hsl(129,38%,56%)] to-[hsl(23,100%,63%)] text-white">
        <CardTitle className="text-2xl flex items-center gap-2">
          <span className="text-3xl">📊</span>
          Résumé total
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center space-y-2">
            <div className="text-4xl">🔥</div>
            <p className="text-sm text-muted-foreground">Calories totales</p>
            <p className="text-3xl font-bold text-[hsl(23,100%,63%)]">{calories} kcal</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-4xl">💪</div>
            <p className="text-sm text-muted-foreground">Protéines totales</p>
            <p className="text-3xl font-bold text-blue-500">{protein} g</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-4xl">🌾</div>
            <p className="text-sm text-muted-foreground">Glucides totaux</p>
            <p className="text-3xl font-bold text-yellow-600">{carbs} g</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-4xl">🥑</div>
            <p className="text-sm text-muted-foreground">Lipides totaux</p>
            <p className="text-3xl font-bold text-[hsl(129,38%,56%)]">{fat} g</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

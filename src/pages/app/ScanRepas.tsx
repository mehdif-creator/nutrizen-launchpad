import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Loader2, Brain, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAutomationJob } from '@/hooks/useAutomationJob';
import { InsufficientCreditsModal } from '@/components/app/InsufficientCreditsModal';

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
  analyse_nutritionnelle?: string;
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

// Generate a stable idempotency key from file content
async function generateIdempotencyKey(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `scan_repas_${hashHex.substring(0, 16)}_${Date.now()}`;
}

export default function ScanRepas() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const {
    status,
    result,
    error,
    creditsInfo,
    isLoading,
    isInsufficientCredits,
    startJob,
    reset: resetJob,
  } = useAutomationJob({
    onSuccess: (jobResult) => {
      console.log('[ScanRepas] Job success:', jobResult);
      if (jobResult.food && jobResult.total) {
        setAnalysisResult({
          food: jobResult.food,
          total: jobResult.total,
          analyse_nutritionnelle: jobResult.analyse_nutritionnelle,
        });
        toast.success('Analyse terminée avec succès !');
      }
    },
    onError: (errorMsg, errorCode) => {
      console.error('[ScanRepas] Job error:', errorMsg, errorCode);
      if (errorCode !== 'INSUFFICIENT_CREDITS') {
        toast.error(errorMsg || 'Erreur lors de l\'analyse');
      }
    },
  });

  // Handle insufficient credits
  useEffect(() => {
    if (isInsufficientCredits && creditsInfo) {
      setCreditsModalOpen(true);
    }
  }, [isInsufficientCredits, creditsInfo]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      resetJob();
    } else {
      toast.error('Veuillez sélectionner une image');
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    console.log('[ScanRepas] Starting analysis...', { 
      fileName: selectedFile.name, 
      fileSize: selectedFile.size,
      fileType: selectedFile.type 
    });

    try {
      // Generate idempotency key from file content
      const key = await generateIdempotencyKey(selectedFile);
      setIdempotencyKey(key);

      // Convert file to base64 for payload
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        
        const jobResult = await startJob('scan_repas', {
          image_base64: base64Data,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
        }, key);

        console.log('[ScanRepas] Job started:', jobResult);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      console.error('[ScanRepas] Error starting job:', err);
      toast.error('Erreur lors du démarrage de l\'analyse');
    }
  }, [selectedFile, startJob]);

  const handleRetry = useCallback(() => {
    resetJob();
    if (selectedFile && idempotencyKey) {
      // Generate new idempotency key for retry
      handleAnalyze();
    }
  }, [resetJob, selectedFile, idempotencyKey, handleAnalyze]);

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setIdempotencyKey(null);
    resetJob();
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
      setAnalysisResult(null);
      resetJob();
    } else {
      toast.error('Veuillez sélectionner une image');
    }
  };

  // Render loading state
  const renderLoadingState = () => (
    <Card className="shadow-lg animate-fade-in border-0">
      <CardContent className="p-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-white rounded-full blur-xl opacity-50 animate-pulse" />
            <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
          </div>
          <div>
            <p className="text-xl font-semibold mb-2">
              {status === 'queued' ? 'En file d\'attente... 🍃' : 'Analyse en cours... 🍃'}
            </p>
            <p className="text-muted-foreground">
              {status === 'queued' 
                ? 'Votre demande sera traitée dans quelques instants' 
                : 'Respire un instant, on analyse ton repas'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render error state
  const renderErrorState = () => (
    <Card className="shadow-lg animate-fade-in border-0 border-l-4 border-l-destructive">
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div>
            <p className="text-xl font-semibold mb-2 text-destructive">
              Erreur lors de l'analyse
            </p>
            <p className="text-muted-foreground mb-4">
              {error || 'Une erreur inattendue est survenue'}
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={handleRetry} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
            <Button onClick={handleReset} variant="outline">
              Nouvelle photo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F9FFF9] to-white">
      <AppHeader />
      
      <main className="flex-1 container py-8 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            Analyse ton repas en 1 clic 🍽️
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Prends une photo de ton repas et découvre instantanément ses apports nutritionnels.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && renderLoadingState()}

        {/* Error State */}
        {status === 'error' && !isInsufficientCredits && renderErrorState()}

        {/* Upload Form */}
        {!isLoading && status !== 'error' && !analysisResult && (
          <Card className="shadow-lg animate-slide-up border-0 overflow-hidden" style={{ borderRadius: '1.5rem' }}>
            <CardContent className="p-8">
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
                        ? 'border-primary bg-primary/5 scale-105 shadow-[0_0_20px_rgba(95,178,102,0.3)]' 
                        : 'border-muted-foreground/30 hover:border-primary hover:scale-105 hover:shadow-[0_0_15px_rgba(95,178,102,0.2)]'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full animate-pulse">
                        <Camera className="h-12 w-12 text-primary" />
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
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg transition-all duration-300 hover:scale-105"
                    size="lg"
                    style={{ borderRadius: '1rem' }}
                  >
                    Analyser mon repas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {analysisResult && (
          <div className="space-y-6">
            {/* Summary Card */}
            <SummaryCard total={analysisResult.total} />

            {/* Nutritional Analysis */}
            {analysisResult.analyse_nutritionnelle && (
              <Card 
                className="shadow-[rgba(0,0,0,0.05)_2px_2px_5px] border-0"
                style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out 0.2s both' }}
              >
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Analyse nutritionnelle
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {analysisResult.analyse_nutritionnelle}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Food Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.food.map((item, index) => (
                <Card 
                  key={index} 
                  className="shadow-[rgba(0,0,0,0.05)_2px_2px_5px] border-0 hover:shadow-lg transition-all duration-300 hover:scale-105"
                  style={{ 
                    borderRadius: '1.5rem',
                    animation: `fadeIn 0.5s ease-out ${(index * 0.1) + 0.4}s both`
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
                          <span className="text-accent font-semibold">{item.calories} kcal</span>
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
                          <span className="text-primary font-semibold">{item.fat} g</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                className="bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:animate-bounce"
                style={{ borderRadius: '1rem' }}
              >
                🔁 Analyser un autre repas
              </Button>
            </div>
          </div>
        )}
      </main>

      <AppFooter />

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        open={creditsModalOpen}
        onOpenChange={setCreditsModalOpen}
        currentBalance={creditsInfo?.current || 0}
        required={creditsInfo?.required || 2}
        feature="scanrepas"
      />
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
      <CardHeader className="bg-gradient-to-r from-primary to-accent text-white">
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
            <p className="text-3xl font-bold text-accent">{calories} kcal</p>
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
            <p className="text-3xl font-bold text-primary">{fat} g</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

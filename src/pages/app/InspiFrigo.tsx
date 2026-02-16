import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { AppFooter } from "@/components/app/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAutomationJob } from "@/hooks/useAutomationJob";
import { InsufficientCreditsModal } from "@/components/app/InsufficientCreditsModal";
import { createLogger } from "@/lib/logger";

const logger = createLogger('InspiFrigo');

interface Ingredient {
  nom: string;
  quantité_estimée: string;
}

interface Recette {
  étapes: string[];
  temps_préparation: string;
  temps_cuisson: string;
  portions: number;
}

interface Plat {
  nom: string;
  description: string;
  ingredients_identifiés: Ingredient[];
  recette: Recette;
  note_nutritionnelle?: string;
}

interface AnalysisResult {
  status: string;
  plat: Plat;
}

// Generate a stable idempotency key from file content
async function generateIdempotencyKey(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `inspi_frigo_${hashHex.substring(0, 16)}_${Date.now()}`;
}

export default function InspiFrigo() {
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
      logger.debug('Job success', { jobResult });
      if (jobResult.plat || jobResult.status === 'succès') {
        setAnalysisResult({
          status: jobResult.status || 'succès',
          plat: jobResult.plat,
        });
        toast.success('Analyse terminée avec succès !');
      }
    },
    onError: (errorMsg, errorCode) => {
      logger.error('Job error', new Error(errorMsg || 'Unknown'), { errorCode });
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
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      resetJob();
    } else {
      toast.error("Veuillez sélectionner une image");
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    logger.debug('Starting analysis...', { 
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
        
        const jobResult = await startJob('inspi_frigo', {
          image_base64: base64Data,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
        }, key);

        logger.debug('Job started', { jobResult });
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      logger.error('Error starting job', err instanceof Error ? err : new Error(String(err)));
      toast.error('Erreur lors du démarrage de l\'analyse');
    }
  }, [selectedFile, startJob]);

  const handleRetry = useCallback(() => {
    resetJob();
    if (selectedFile && idempotencyKey) {
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
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      resetJob();
    } else {
      toast.error("Veuillez sélectionner une image");
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
                : 'Prépare-toi à cuisiner !'}
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
            Trouve des idées de recettes à partir de ton frigo
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Prends une photo de ton frigo ou de tes ingrédients, et découvre des recettes adaptées à ce que tu as sous
            la main.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && renderLoadingState()}

        {/* Error State */}
        {status === 'error' && !isInsufficientCredits && renderErrorState()}

        {/* Upload Form */}
        {!isLoading && status !== 'error' && !analysisResult && (
          <Card className="shadow-lg animate-slide-up border-0 overflow-hidden" style={{ borderRadius: "1.5rem" }}>
            <CardContent className="p-8">
              <div className="space-y-6">
                {previewUrl ? (
                  <div className="relative rounded-[1.5rem] overflow-hidden border-2 border-border shadow-[rgba(0,0,0,0.05)_2px_2px_5px]">
                    <img src={previewUrl} alt="Aperçu" className="w-full h-auto max-h-96 object-contain" />
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-[1.5rem] p-12 text-center transition-all duration-300 cursor-pointer ${
                      isDragging
                        ? "border-primary bg-primary/5 scale-105 shadow-[0_0_20px_rgba(95,178,102,0.3)]"
                        : "border-muted-foreground/30 hover:border-primary hover:scale-105 hover:shadow-[0_0_15px_rgba(95,178,102,0.2)]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full animate-pulse">
                        <Camera className="h-12 w-12 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-medium mb-2">
                          📸 Dépose une photo de ton frigo ici ou prends une photo
                        </p>
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
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
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
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg transition-all duration-300 hover:scale-105"
                    size="lg"
                    style={{ borderRadius: "1rem" }}
                  >
                    Analyser mon frigo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {analysisResult && (
          <div className="space-y-6">
            {/* Plat suggéré */}
            <Card
              className="shadow-[rgba(0,0,0,0.05)_2px_2px_5px] border-0"
              style={{ borderRadius: "1.5rem", animation: "fadeIn 0.5s ease-out" }}
            >
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <span className="text-4xl">🍽️</span>
                  {analysisResult.plat.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg text-muted-foreground">{analysisResult.plat.description}</p>

                {/* Info rapide */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full font-medium">
                    ⏱️ Préparation: {analysisResult.plat.recette.temps_préparation}
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full font-medium">
                    🔥 Cuisson: {analysisResult.plat.recette.temps_cuisson}
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full font-medium">
                    👥 {analysisResult.plat.recette.portions} portion(s)
                  </div>
                </div>

                {/* Ingrédients détectés */}
                <div>
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <span className="text-2xl">🧺</span>
                    Ingrédients identifiés
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysisResult.plat.ingredients_identifiés.map((ingredient, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg"
                        style={{ animation: `fadeIn 0.5s ease-out ${index * 0.1}s both` }}
                      >
                        <span className="font-medium">{ingredient.nom}</span>
                        <span className="text-sm text-muted-foreground">{ingredient.quantité_estimée}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Étapes de la recette */}
                <div>
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <span className="text-2xl">📝</span>
                    Étapes de préparation
                  </h3>
                  <ol className="space-y-3">
                    {analysisResult.plat.recette.étapes.map((etape, index) => (
                      <li
                        key={index}
                        className="flex gap-3 p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg"
                        style={{ animation: `fadeIn 0.5s ease-out ${index * 0.1}s both` }}
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="flex-1">{etape}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Note nutritionnelle */}
                {analysisResult.plat.note_nutritionnelle && (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                      <span className="text-xl">💚</span>
                      Note nutritionnelle
                    </h3>
                    <p className="text-sm text-muted-foreground">{analysisResult.plat.note_nutritionnelle}</p>
                  </div>
                )}
              </CardContent>
            </Card>

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
                className="bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white shadow-lg transition-all duration-300 hover:scale-110"
                style={{ borderRadius: "1rem" }}
              >
                🔁 Analyser une autre photo
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
        feature="inspifrigo"
      />
    </div>
  );
}

import { useState, useCallback } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { AppFooter } from "@/components/app/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Loader2, RefreshCw, AlertCircle, Coins } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { callEdgeFunction } from "@/lib/edgeFn";
import { InsufficientCreditsModal } from "@/components/app/InsufficientCreditsModal";
import { FEATURE_COSTS } from "@/lib/featureCosts";

interface AnalysisResult {
  ingredients_identifies: { nom: string; quantite: string }[];
  recettes: {
    nom: string;
    description: string;
    difficulte: string;
    temps_preparation: string;
    temps_cuisson: string;
    portions: number;
    ingredients_necessaires: string[];
    etapes: string[];
    note_nutritionnelle: string;
  }[];
}

export default function InspiFrigo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState<{ current: number; required: number } | null>(null);

  const queryClient = useQueryClient();
  const cost = FEATURE_COSTS.inspi_frigo;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      setError(null);
    } else {
      toast.error("Veuillez sélectionner une image");
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Call Edge Function (handles credits + OpenAI in one atomic call)
      const result = await callEdgeFunction<AnalysisResult & { error_code?: string; current_balance?: number; required?: number }>('analyze-fridge-photo', {
        image: base64,
      });

      // Check for insufficient credits response
      if ((result as any).error_code === 'INSUFFICIENT_CREDITS') {
        setCreditsInfo({
          current: (result as any).current_balance || 0,
          required: (result as any).required || cost,
        });
        setCreditsModalOpen(true);
        setIsLoading(false);
        return;
      }

      if ((result as any).error) {
        throw new Error((result as any).error);
      }

      setAnalysisResult(result);
      toast.success("Analyse terminée !");
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["user-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["gamification"] });

    } catch (err: any) {
      const msg = err?.message || "Erreur lors de l'analyse";

      // Try to parse insufficient credits from error message
      if (msg.includes('INSUFFICIENT') || msg.includes('insuffisants')) {
        try {
          const parsed = JSON.parse(msg);
          setCreditsInfo({
            current: parsed.current_balance || 0,
            required: parsed.required || cost,
          });
          setCreditsModalOpen(true);
          setIsLoading(false);
          return;
        } catch {
          // Not a JSON error, fall through
        }
      }

      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, queryClient, cost]);

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
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
      setError(null);
    } else {
      toast.error("Veuillez sélectionner une image");
    }
  };

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
            Prends une photo de ton frigo ou de tes ingrédients, et découvre des recettes adaptées à ce que tu as sous la main.
          </p>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Coins className="h-4 w-4" />
            Coût : {cost} crédits
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="shadow-lg animate-fade-in border-0">
            <CardContent className="p-12">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-white rounded-full blur-xl opacity-50 animate-pulse" />
                  <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
                </div>
                <div>
                  <p className="text-xl font-semibold mb-2">Analyse en cours... 🍃</p>
                  <p className="text-muted-foreground">Notre IA analyse votre photo, patientez quelques secondes.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="shadow-lg animate-fade-in border-0 border-l-4 border-l-destructive">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-6 text-center">
                <AlertCircle className="h-16 w-16 text-destructive" />
                <div>
                  <p className="text-xl font-semibold mb-2 text-destructive">Erreur lors de l'analyse</p>
                  <p className="text-muted-foreground mb-4">{error}</p>
                </div>
                <div className="flex gap-4">
                  <Button onClick={handleAnalyze} variant="default" className="gap-2">
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
        )}

        {/* Upload Form */}
        {!isLoading && !error && !analysisResult && (
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
                        <p className="text-lg font-medium mb-2">📸 Dépose une photo de ton frigo ici ou prends une photo</p>
                        <p className="text-sm text-muted-foreground">Glisse ton image ou utilise les boutons ci-dessous</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex-1">
                    <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
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
                    Analyser mon frigo ({cost} crédits)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {analysisResult && (
          <div className="space-y-6">
            {/* Ingrédients détectés */}
            <Card className="border-0 shadow-lg" style={{ borderRadius: "1.5rem" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  🧺 Ingrédients détectés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.ingredients_identifies.map((ing, i) => (
                    <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {ing.nom} — {ing.quantite}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recettes */}
            <h2 className="text-2xl font-bold text-center">🍽️ Recettes possibles</h2>
            {analysisResult.recettes.map((recette, index) => (
              <Card key={index} className="border-0 shadow-lg" style={{ borderRadius: "1.5rem" }}>
                <CardHeader>
                  <CardTitle className="text-2xl">{recette.nom}</CardTitle>
                  <p className="text-muted-foreground">{recette.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm">
                    <span className="px-3 py-1 bg-primary/10 rounded-full">⏱️ Prépa : {recette.temps_preparation}</span>
                    <span className="px-3 py-1 bg-primary/10 rounded-full">🔥 Cuisson : {recette.temps_cuisson}</span>
                    <span className="px-3 py-1 bg-primary/10 rounded-full">👥 {recette.portions} portion(s)</span>
                    <span className="px-3 py-1 bg-primary/10 rounded-full">📊 {recette.difficulte}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">🛒 Ingrédients nécessaires</h4>
                    <ul className="grid grid-cols-2 gap-1">
                      {recette.ingredients_necessaires.map((ing, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                          <span className="text-primary">•</span> {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">📝 Étapes</h4>
                    <ol className="space-y-2">
                      {recette.etapes.map((etape, i) => (
                        <li key={i} className="flex gap-3 text-sm p-2 bg-primary/5 rounded-lg">
                          <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                          {etape}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                    💚 {recette.note_nutritionnelle}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-center">
              <Button onClick={handleReset} size="lg" className="bg-gradient-to-r from-accent to-primary text-white" style={{ borderRadius: "1rem" }}>
                🔁 Analyser une autre photo
              </Button>
            </div>
          </div>
        )}
      </main>

      <AppFooter />

      <InsufficientCreditsModal
        open={creditsModalOpen}
        onOpenChange={setCreditsModalOpen}
        currentBalance={creditsInfo?.current ?? 0}
        required={creditsInfo?.required ?? cost}
        feature="inspifrigo"
      />
    </div>
  );
}

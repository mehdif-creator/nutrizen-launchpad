import { useState, useCallback } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { AppFooter } from "@/components/app/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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

export default function InspiFrigo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

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
      // Send image directly to n8n webhook as multipart/form-data
      const formData = new FormData();
      formData.append('image', selectedFile);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('https://n8n.srv1005117.hstgr.cloud/webhook/analyse-frigo', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status}). Veuillez réessayer.`);
      }

      const data = await response.json();

      // Success
      if (data.plat) {
        setAnalysisResult({
          status: data.status || 'succès',
          plat: data.plat,
        });
        toast.success('Analyse terminée avec succès !');
        queryClient.invalidateQueries({ queryKey: ['credits'] });
        queryClient.invalidateQueries({ queryKey: ['user-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['gamification'] });
      } else {
        throw new Error(data.error || 'Réponse inattendue du serveur');
      }
    } catch (err: any) {
      const msg = err?.name === 'AbortError'
        ? 'L\'analyse a pris trop de temps. Veuillez réessayer.'
        : (err?.message || 'Erreur lors de l\'analyse');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, queryClient]);

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
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            ✨ Gratuit — propulsé par n8n
          </div>
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
            <Card className="shadow-[rgba(0,0,0,0.05)_2px_2px_5px] border-0" style={{ borderRadius: "1.5rem", animation: "fadeIn 0.5s ease-out" }}>
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <span className="text-4xl">🍽️</span>
                  {analysisResult.plat.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg text-muted-foreground">{analysisResult.plat.description}</p>

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
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
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

    </div>
  );
}

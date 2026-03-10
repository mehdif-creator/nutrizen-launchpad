import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Loader2, Brain, RefreshCw, AlertCircle, AlertTriangle, Lightbulb, Info, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { InsufficientCreditsModal } from '@/components/app/InsufficientCreditsModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getFeatureCost } from '@/lib/featureCosts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Aliment {
  nom: string;
  quantité: string;
  calories: number | null;
  protéines: number | null;
  glucides: number | null;
  lipides: number | null;
}

interface Incertitude {
  champ: string;
  raison: string;
  valeur_possible: null;
}

interface ScanRepasResponse {
  status: 'succès' | 'erreur';
  nom_du_plat: string;
  description: string;
  aliments: Aliment[];
  total: {
    calories: number | null;
    protéines: number | null;
    glucides: number | null;
    lipides: number | null;
  };
  micronutriments_notables: string[];
  analyse_nutritionnelle: string;
  recommandations: string[];
  confiance_estimation: number;
  hypotheses: string[];
  incertitudes: Incertitude[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validateImage(file: File): string | null {
  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Format non supporté. Utilisez JPG, PNG ou WebP.';
  }
  if (file.size > MAX_SIZE) {
    return 'Image trop lourde (max 10 Mo).';
  }
  return null;
}

function macro(v: number | null | undefined): string {
  return v != null ? String(Math.round(v)) : '—';
}

function confidenceColor(c: number): string {
  if (c >= 70) return 'bg-green-500/15 text-green-700 border-green-300';
  if (c >= 40) return 'bg-orange-500/15 text-orange-700 border-orange-300';
  return 'bg-red-500/15 text-red-700 border-red-300';
}

// ─── Counter animation hook ──────────────────────────────────────────────────

const useCountUp = (end: number, duration = 800, start = 0) => {
  const [count, setCount] = useState(start);
  useEffect(() => {
    if (end === start) return;
    let startTime: number;
    const animate = (t: number) => {
      if (!startTime) startTime = t;
      const p = Math.min((t - startTime) / duration, 1);
      setCount(Math.floor(p * (end - start) + start));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, start]);
  return count;
};

// ─── Edge Function URL ───────────────────────────────────────────────────────

const ANALYSE_REPAS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyse-repas`;
const SCAN_COST = getFeatureCost('scan_repas');
// ─── Main Component ──────────────────────────────────────────────────────────

export default function ScanRepas() {
  const { subscription } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanRepasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState<{ current: number; required: number } | null>(null);

  // ── File handling ────────────────────────────────────────────────────────

  const pickFile = (file: File) => {
    const err = validateImage(file);
    if (err) { toast.error(err); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  // Credits are now debited server-side in the analyse-repas edge function

  // ── Analysis ─────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Auth check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Veuillez vous connecter.'); setLoading(false); return; }

      // Generate unique request_id for idempotency
      const requestId = crypto.randomUUID();

      // Send to edge function (credits are debited server-side)
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('request_id', requestId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(ANALYSE_REPAS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Read body as text first (n8n may return non-JSON on errors)
      const raw = await response.text();
      console.log('[ScanRepas] Status:', response.status, '| Content-Type:', response.headers.get('content-type'));
      console.log('[ScanRepas] Body preview:', raw.substring(0, 300));

      if (!response.ok) {
        let detail = '';
        try {
          const errJson = JSON.parse(raw);
          // Handle insufficient credits from server
          if (response.status === 402 || errJson?.error_code === 'INSUFFICIENT_CREDITS') {
            setCreditsInfo({ 
              current: errJson?.current_balance ?? 0, 
              required: errJson?.required ?? SCAN_COST 
            });
            setCreditsModalOpen(true);
            setLoading(false);
            return;
          }
          detail = errJson?.message || errJson?.error || '';
        } catch {
          if (raw.trim().startsWith('<!') || raw.includes('<html')) {
            detail = 'Le serveur a renvoyé une page HTML au lieu de JSON.';
          }
        }
        throw new Error(`Erreur serveur (${response.status})${detail ? ' : ' + detail : ''}`);
      }

      let json: any;
      try {
        json = JSON.parse(raw);
      } catch {
        throw new Error('Réponse invalide du serveur (JSON attendu).');
      }

      const data: ScanRepasResponse = Array.isArray(json) ? json[0] : json;

      if (data.status !== 'succès' || !data.aliments) {
        throw new Error("L'analyse a échoué. Vérifiez que l'image montre bien un repas et réessayez.");
      }

      setResult(data);
      toast.success('Analyse terminée !');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('Délai dépassé — réessayez avec une image plus légère.');
      } else {
        setError(err?.message || "L'analyse a échoué. Vérifiez que l'image montre bien un repas et réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <AppHeader />

      <main className="flex-1 container py-6 md:py-8 px-4 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <h1 className="text-[clamp(1.5rem,4vw,3rem)] md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            Analyse ton repas en 1 clic 🍽️
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Prends une photo de ton repas et découvre instantanément ses apports nutritionnels.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full w-fit mx-auto">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Coût : {SCAN_COST} crédit{SCAN_COST > 1 ? 's' : ''} par analyse</span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <Card className="shadow-lg animate-fade-in border-0">
            <CardContent className="p-12">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-background rounded-full blur-xl opacity-50 animate-pulse" />
                  <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
                </div>
                <div>
                  <p className="text-xl font-semibold mb-2">Analyse en cours... 🍃</p>
                  <p className="text-muted-foreground">Respire un instant, on analyse ton repas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && !loading && (
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
                    <RefreshCw className="h-4 w-4" /> Réessayer
                  </Button>
                  <Button onClick={handleReset} variant="outline">Nouvelle photo</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload form */}
        {!loading && !error && !result && (
          <Card className="shadow-lg animate-slide-up border-0 overflow-hidden" style={{ borderRadius: '1.5rem' }}>
            <CardContent className="p-8">
              <div className="space-y-6">
                {previewUrl ? (
                  <div className="relative rounded-[1.5rem] overflow-hidden border-2 border-border shadow-sm">
                    <img src={previewUrl} alt="Aperçu" className="w-full h-auto max-h-96 object-contain" />
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-[1.5rem] p-8 md:p-12 text-center transition-all duration-300 cursor-pointer ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/30 active:border-primary'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full min-w-[120px] min-h-[120px] flex items-center justify-center">
                        <Camera className="h-12 w-12 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-medium mb-2">📸 Prenez en photo votre repas</p>
                        <p className="text-sm text-muted-foreground">Glissez votre image ou utilisez les boutons ci-dessous</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" id="camera-input" />
                    <label htmlFor="camera-input" className="w-full">
                      <Button type="button" variant="outline" className="w-full" asChild>
                        <span className="cursor-pointer"><Camera className="mr-2 h-4 w-4" />Prendre une photo</span>
                      </Button>
                    </label>
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="file-input" />
                    <label htmlFor="file-input" className="w-full">
                      <Button type="button" variant="outline" className="w-full" asChild>
                        <span className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Choisir un fichier</span>
                      </Button>
                    </label>
                  </div>
                </div>

                {selectedFile && (
                  <Button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-lg"
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

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {result && <ResultsView data={result} onReset={handleReset} />}
      </main>

      <AppFooter />

      <InsufficientCreditsModal
        open={creditsModalOpen}
        onOpenChange={setCreditsModalOpen}
        currentBalance={creditsInfo?.current ?? 0}
        required={creditsInfo?.required ?? SCAN_COST}
        feature="scanrepas"
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Results View ────────────────────────────────────────────────────────────

function ResultsView({ data, onReset }: { data: ScanRepasResponse; onReset: () => void }) {
  return (
    <div className="space-y-6">
      {/* Dish name & description */}
      <Card className="shadow-lg border-0 overflow-hidden" style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out both' }}>
        <CardHeader className="bg-gradient-to-r from-primary to-accent text-primary-foreground pb-4">
          <CardTitle className="text-2xl">{data.nom_du_plat}</CardTitle>
          <p className="text-primary-foreground/80 text-sm mt-1">{data.description}</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`text-sm px-3 py-1 border ${confidenceColor(data.confiance_estimation)}`}>
              Confiance : {data.confiance_estimation}%
            </Badge>
            {data.micronutriments_notables?.map((m, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary macros */}
      <SummaryCard total={data.total} />

      {/* Ingredients table */}
      <Card className="shadow-sm border-0 overflow-hidden" style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out 0.2s both' }}>
        <CardHeader>
          <CardTitle className="text-lg">Détail des aliments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Aliment</th>
                  <th className="text-left p-3 font-medium">Quantité</th>
                  <th className="text-right p-3 font-medium">Calories</th>
                  <th className="text-right p-3 font-medium">Protéines</th>
                  <th className="text-right p-3 font-medium">Glucides</th>
                  <th className="text-right p-3 font-medium">Lipides</th>
                </tr>
              </thead>
              <tbody>
                {data.aliments.map((a, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{a.nom}</td>
                    <td className="p-3 text-muted-foreground">{a.quantité}</td>
                    <td className="p-3 text-right">{macro(a.calories)}</td>
                    <td className="p-3 text-right">{macro(a.protéines)}</td>
                    <td className="p-3 text-right">{macro(a.glucides)}</td>
                    <td className="p-3 text-right">{macro(a.lipides)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-bold">
                  <td className="p-3" colSpan={2}>Total</td>
                  <td className="p-3 text-right">{macro(data.total.calories)}</td>
                  <td className="p-3 text-right">{macro(data.total.protéines)}</td>
                  <td className="p-3 text-right">{macro(data.total.glucides)}</td>
                  <td className="p-3 text-right">{macro(data.total.lipides)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Nutritional analysis */}
      {data.analyse_nutritionnelle && (
        <Card className="shadow-sm border-0" style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out 0.3s both' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" /> Analyse nutritionnelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{data.analyse_nutritionnelle}</p>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {data.recommandations?.length > 0 && (
        <Card className="shadow-sm border-0" style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out 0.4s both' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent" /> Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommandations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-accent mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Hypotheses */}
      {data.hypotheses?.length > 0 && (
        <Card className="shadow-sm border-0 bg-muted/30" style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out 0.45s both' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Info className="h-4 w-4" /> Hypothèses retenues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {data.hypotheses.map((h, i) => (
                <li key={i} className="text-xs text-muted-foreground">— {h}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Uncertainties */}
      {data.incertitudes?.length > 0 && (
        <Card className="shadow-sm border-0 border-l-4 border-l-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10" style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out 0.5s both' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" /> Incertitudes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.incertitudes.map((inc, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{inc.champ}</span>{' '}
                  <span className="text-muted-foreground">— {inc.raison}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Reset button */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={onReset}
          size="lg"
          className="bg-gradient-to-r from-accent to-primary hover:opacity-90 text-primary-foreground shadow-lg"
          style={{ borderRadius: '1rem' }}
        >
          🔁 Analyser un autre repas
        </Button>
      </div>
    </div>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({ total }: { total: ScanRepasResponse['total'] }) {
  const cal = useCountUp(total.calories ?? 0);
  const prot = useCountUp(total.protéines ?? 0);
  const carbs = useCountUp(total.glucides ?? 0);
  const fat = useCountUp(total.lipides ?? 0);

  return (
    <Card className="shadow-sm border-0 overflow-hidden" style={{ borderRadius: '1.5rem', animation: 'fadeIn 0.5s ease-out 0.1s both' }}>
      <CardContent className="p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center space-y-1">
            <div className="text-3xl">🔥</div>
            <p className="text-xs text-muted-foreground">Calories</p>
            <p className="text-2xl font-bold text-accent">{cal} kcal</p>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl">💪</div>
            <p className="text-xs text-muted-foreground">Protéines</p>
            <p className="text-2xl font-bold text-blue-500">{prot} g</p>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl">🌾</div>
            <p className="text-xs text-muted-foreground">Glucides</p>
            <p className="text-2xl font-bold text-yellow-600">{carbs} g</p>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl">🥑</div>
            <p className="text-xs text-muted-foreground">Lipides</p>
            <p className="text-2xl font-bold text-primary">{fat} g</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

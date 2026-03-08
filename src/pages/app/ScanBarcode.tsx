import { useState, useEffect, useRef, useCallback } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Loader2, Save, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { InsufficientCreditsModal } from '@/components/app/InsufficientCreditsModal';
import { checkAndConsumeCredits } from '@/lib/credits';

const NUTRISCORE_COLORS: Record<string, string> = {
  a: 'bg-green-600 text-white',
  b: 'bg-lime-500 text-white',
  c: 'bg-yellow-400 text-black',
  d: 'bg-orange-500 text-white',
  e: 'bg-red-600 text-white',
};

interface ProductData {
  name: string;
  brand: string;
  nutriscore: string;
  calories: number | null;
  proteins: number | null;
  carbs: number | null;
  fats: number | null;
  salt: number | null;
  fiber: number | null;
  imageUrl: string | null;
  barcode: string;
}

export default function ScanBarcode() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState({ current: 0, required: 1 });
  const readerRef = useRef<any>(null);

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  const lookupProduct = async (barcode: string) => {
    setLoading(true);
    setError(null);
    try {
      // Consume 1 credit
      const creditResult = await checkAndConsumeCredits('scan_barcode', 1);
      if (!creditResult.success) {
        if (creditResult.error_code === 'INSUFFICIENT_CREDITS') {
          setCreditsInfo({
            current: creditResult.current_balance ?? 0,
            required: creditResult.required ?? 1,
          });
          setCreditsModalOpen(true);
          setLoading(false);
          return;
        }
        throw new Error(creditResult.message || 'Erreur de crédits');
      }

      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const json = await res.json();

      if (json.status !== 1 || !json.product) {
        setError('Produit non trouvé dans la base Open Food Facts');
        setLoading(false);
        return;
      }

      const p = json.product;
      const n = p.nutriments || {};
      setProduct({
        name: p.product_name || 'Produit inconnu',
        brand: p.brands || '',
        nutriscore: (p.nutriscore_grade || '').toLowerCase(),
        calories: n['energy-kcal_100g'] ?? null,
        proteins: n.proteins_100g ?? null,
        carbs: n.carbohydrates_100g ?? null,
        fats: n.fat_100g ?? null,
        salt: n.salt_100g ?? null,
        fiber: n.fiber_100g ?? null,
        imageUrl: p.image_front_url || null,
        barcode,
      });
      toast.success('Produit trouvé !');
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la recherche du produit');
    } finally {
      setLoading(false);
    }
  };

  const startScanning = async () => {
    setProduct(null);
    setError(null);
    setScanning(true);

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      await reader.decodeFromVideoDevice(null, videoRef.current!, (result) => {
        if (result) {
          const barcode = result.getText();
          stopScanning();
          lookupProduct(barcode);
        }
      });
    } catch {
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!product || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_foods').insert({
        user_id: user.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand || null,
        calories_per_100g: product.calories,
        proteins_per_100g: product.proteins,
        carbs_per_100g: product.carbs,
        fats_per_100g: product.fats,
        nutriscore: product.nutriscore || null,
        image_url: product.imageUrl,
      });
      if (error) throw error;
      toast.success('Produit sauvegardé dans vos aliments !');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => { stopScanning(); };
  }, [stopScanning]);

  const macro = (v: number | null) => v != null ? Math.round(v * 10) / 10 : '—';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <AppHeader />
      <main className="flex-1 container py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Scan Code-Barres 📷</h1>
          <p className="text-muted-foreground">Scannez un produit pour voir ses informations nutritionnelles</p>
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full w-fit mx-auto">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Coût : 1 crédit par scan</span>
          </div>
        </div>

        {/* Scanner */}
        {!product && !loading && (
          <Card className="overflow-hidden mb-6">
            <CardContent className="p-0">
              {scanning ? (
                <div className="relative">
                  <video ref={videoRef} className="w-full aspect-[4/3] object-cover bg-black" />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-40 border-2 border-primary rounded-lg relative overflow-hidden">
                      <div className="absolute left-0 right-0 h-0.5 bg-primary animate-bounce" 
                        style={{ animation: 'scanLine 2s ease-in-out infinite' }} />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <Button variant="destructive" size="sm" onClick={stopScanning}>
                      Arrêter le scan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <Button onClick={startScanning} size="lg" className="gap-2">
                    <Camera className="h-5 w-5" />
                    Démarrer le scanner
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card className="p-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Recherche du produit...</p>
          </Card>
        )}

        {/* Error */}
        {error && !loading && (
          <Card className="p-8 text-center border-destructive/50">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="font-semibold mb-2">Erreur</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => { setError(null); startScanning(); }} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Réessayer
            </Button>
          </Card>
        )}

        {/* Product result */}
        {product && (
          <Card className="overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            {product.imageUrl && (
              <div className="h-48 bg-muted">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{product.name}</CardTitle>
                  {product.brand && <p className="text-sm text-muted-foreground mt-1">{product.brand}</p>}
                </div>
                {product.nutriscore && NUTRISCORE_COLORS[product.nutriscore] && (
                  <Badge className={`text-lg px-3 py-1 font-bold ${NUTRISCORE_COLORS[product.nutriscore]}`}>
                    {product.nutriscore.toUpperCase()}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Pour 100g :</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Calories', value: macro(product.calories), unit: 'kcal' },
                  { label: 'Protéines', value: macro(product.proteins), unit: 'g' },
                  { label: 'Glucides', value: macro(product.carbs), unit: 'g' },
                  { label: 'Lipides', value: macro(product.fats), unit: 'g' },
                  { label: 'Sel', value: macro(product.salt), unit: 'g' },
                  { label: 'Fibres', value: macro(product.fiber), unit: 'g' },
                ].map((item) => (
                  <div key={item.label} className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold">{item.value} <span className="text-xs font-normal">{item.unit}</span></p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder dans mes aliments'}
                </Button>
                <Button variant="outline" onClick={() => { setProduct(null); startScanning(); }} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Nouveau scan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <AppFooter />

      <InsufficientCreditsModal
        open={creditsModalOpen}
        onOpenChange={setCreditsModalOpen}
        currentBalance={creditsInfo.current}
        required={creditsInfo.required}
        feature="scan_barcode"
      />

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
      `}</style>
    </div>
  );
}

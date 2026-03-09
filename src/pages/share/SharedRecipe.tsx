import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Flame, Users, ArrowLeft, UtensilsCrossed } from 'lucide-react';
import { SocialShareButtons } from '@/components/share/SocialShareButtons';
import nutrizenLogo from '@/assets/nutrizen-main-logo.png';

interface SharedRecipeData {
  success: boolean;
  recipe: {
    id: string;
    title: string;
    image_url: string | null;
    calories_kcal: number | null;
    proteins_g: number | null;
    carbs_g: number | null;
    fats_g: number | null;
    total_time_min: number | null;
    servings: number | null;
    diet_type: string | null;
    cuisine_type: string | null;
    meal_type: string | null;
  };
  shared_by: {
    display_name: string;
    avatar_url: string | null;
    referral_code: string | null;
  };
  error?: string;
}

export default function SharedRecipe() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedRecipeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Lien invalide.'); setLoading(false); return; }
    (async () => {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_shared_recipe', { p_token: token });
        if (rpcError) { setError('Impossible de charger la recette.'); return; }
        const result = rpcData as unknown as SharedRecipeData;
        if (result?.error) { setError(result.error); return; }
        if (result?.success) setData(result);
        else setError('Recette introuvable.');
      } catch { setError('Erreur de connexion.'); } finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Chargement de la recette...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-lg rounded-2xl">
          <CardContent className="p-8">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-xl font-bold mb-2">Recette introuvable</h1>
            <p className="text-muted-foreground mb-6">{error || 'Ce lien est invalide ou a expiré.'}</p>
            <Link to="/"><Button><ArrowLeft className="h-4 w-4 mr-2" />Retour à l'accueil</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { recipe, shared_by } = data;
  const ctaUrl = shared_by.referral_code
    ? `https://mynutrizen.fr/auth/signup?ref=${shared_by.referral_code}`
    : 'https://mynutrizen.fr/auth/signup';
  const shareUrl = `${window.location.origin}/share/recipe/${token}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={nutrizenLogo} alt="NutriZen" className="h-8" />
          </Link>
          <a href={ctaUrl}>
            <Button size="sm" className="text-xs">Essayer gratuitement</Button>
          </a>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8">
        {/* Recipe Hero */}
        {recipe.image_url && (
          <div className="rounded-2xl overflow-hidden mb-6 shadow-lg" style={{ animation: 'fadeSlideIn 0.5s ease-out' }}>
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full max-h-[420px] object-cover"
            />
          </div>
        )}

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            {shared_by.avatar_url ? (
              <img src={shared_by.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border-2 border-primary" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              Partagé par <strong>{shared_by.display_name}</strong>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">{recipe.title}</h1>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {recipe.cuisine_type && <Badge variant="outline">{recipe.cuisine_type}</Badge>}
            {recipe.diet_type && <Badge variant="outline">{recipe.diet_type}</Badge>}
            {recipe.meal_type && <Badge variant="outline">{recipe.meal_type}</Badge>}
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {recipe.total_time_min && (
            <Card className="p-4 text-center rounded-2xl border-0 shadow-sm bg-primary/5">
              <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-xl font-bold">{recipe.total_time_min}</div>
              <div className="text-[10px] text-muted-foreground">minutes</div>
            </Card>
          )}
          {recipe.calories_kcal && (
            <Card className="p-4 text-center rounded-2xl border-0 shadow-sm bg-primary/5">
              <Flame className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-xl font-bold">{Math.round(recipe.calories_kcal)}</div>
              <div className="text-[10px] text-muted-foreground">kcal</div>
            </Card>
          )}
          {recipe.servings && (
            <Card className="p-4 text-center rounded-2xl border-0 shadow-sm bg-primary/5">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-xl font-bold">{recipe.servings}</div>
              <div className="text-[10px] text-muted-foreground">portions</div>
            </Card>
          )}
        </div>

        {/* Macros */}
        {(recipe.proteins_g || recipe.carbs_g || recipe.fats_g) && (
          <div className="flex justify-center gap-6 mb-8 text-sm text-muted-foreground">
            {recipe.proteins_g && <span>Protéines: <strong>{Math.round(recipe.proteins_g)}g</strong></span>}
            {recipe.carbs_g && <span>Glucides: <strong>{Math.round(recipe.carbs_g)}g</strong></span>}
            {recipe.fats_g && <span>Lipides: <strong>{Math.round(recipe.fats_g)}g</strong></span>}
          </div>
        )}

        {/* Social Share */}
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-3">Partager cette recette</p>
          <SocialShareButtons url={shareUrl} text={`Découvre cette recette : ${recipe.title} sur NutriZen 🍽️`} />
        </div>

        {/* CTA */}
        <div className="text-center py-8 bg-primary/5 rounded-2xl mb-8">
          <h2 className="text-xl font-bold mb-2">Découvre cette recette et bien d'autres sur NutriZen</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Menus personnalisés, liste de courses automatique, scan nutritionnel…
          </p>
          <a href={ctaUrl}>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Créer mes menus gratuitement →
            </Button>
          </a>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} NutriZen — Planification nutritionnelle intelligente</p>
      </footer>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Flame, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { SocialShareButtons } from '@/components/share/SocialShareButtons';
import nutrizenLogo from '@/assets/nutrizen-main-logo.png';

interface TopMeal {
  title: string;
  image_url: string | null;
  calories: number;
  prep_min: number;
  total_min: number;
  proteins_g: number;
  day_name: string;
  meal_type: string;
}

interface SharedPlan {
  success: boolean;
  week_start: string;
  menu_id: string;
  top_meals: TopMeal[];
  stats: { total_meals: number; avg_calories_per_day: number };
  created_at: string;
  shared_by: {
    display_name: string;
    avatar_url: string | null;
    referral_code: string | null;
  };
  error?: string;
}

export default function SharedWeekPlan() {
  const { token } = useParams<{ token: string }>();
  const [plan, setPlan] = useState<SharedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Lien invalide.'); setLoading(false); return; }
    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_shared_week_plan', { p_token: token });
        if (rpcError) { setError('Impossible de charger le menu partagé.'); return; }
        const result = data as unknown as SharedPlan;
        if (result?.error) { setError(result.error); return; }
        if (result?.success) setPlan(result);
        else setError('Menu introuvable.');
      } catch { setError('Erreur de connexion.'); } finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Chargement du menu partagé...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-lg rounded-2xl">
          <CardContent className="p-8">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-xl font-bold mb-2">Lien introuvable</h1>
            <p className="text-muted-foreground mb-6">{error || 'Ce lien de partage est invalide ou a expiré.'}</p>
            <Link to="/"><Button><ArrowLeft className="h-4 w-4 mr-2" />Retour à l'accueil</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weekFormatted = new Date(plan.week_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const ctaUrl = plan.shared_by.referral_code
    ? `https://mynutrizen.fr/auth/signup?ref=${plan.shared_by.referral_code}`
    : 'https://mynutrizen.fr/auth/signup';
  const shareUrl = `${window.location.origin}/share/week/${token}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={nutrizenLogo} alt="NutriZen" className="h-8" />
          </Link>
          <a href={ctaUrl}>
            <Button size="sm" className="text-xs">Essayer gratuitement</Button>
          </a>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            {plan.shared_by.avatar_url ? (
              <img src={plan.shared_by.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-primary" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              Partagé par <strong>{plan.shared_by.display_name}</strong>
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">🥗 Ma semaine de menus NutriZen</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" /> Semaine du {weekFormatted}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="p-5 text-center rounded-2xl border-0 shadow-sm bg-primary/5">
            <Flame className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{plan.stats.avg_calories_per_day}</div>
            <div className="text-xs text-muted-foreground">kcal / jour en moy.</div>
          </Card>
          <Card className="p-5 text-center rounded-2xl border-0 shadow-sm bg-primary/5">
            <UtensilsCrossed className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{plan.stats.total_meals}</div>
            <div className="text-xs text-muted-foreground">repas planifiés</div>
          </Card>
        </div>

        {/* Top Meals */}
        <h2 className="text-lg font-semibold mb-4">🔥 Les repas phares de la semaine</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {plan.top_meals.map((meal, i) => (
            <Card
              key={i}
              className="overflow-hidden rounded-2xl border-0 shadow-md"
              style={{ animation: `fadeSlideIn 0.4s ease-out ${i * 0.08}s both` }}
            >
              {meal.image_url && (
                <img
                  src={meal.image_url}
                  alt={meal.title}
                  className="w-full h-44 object-cover"
                  loading="lazy"
                />
              )}
              <CardContent className="p-4">
                <p className="font-semibold text-sm leading-tight mb-2">{meal.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    {meal.day_name} · {meal.meal_type}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    <Flame className="h-3 w-3 mr-0.5" /> {meal.calories} kcal
                  </Badge>
                  {meal.proteins_g > 0 && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                      P: {meal.proteins_g}g
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Social Share */}
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-3">Partager ce menu</p>
          <SocialShareButtons url={shareUrl} text="Découvre mon menu de la semaine sur NutriZen 🥗" />
        </div>

        {/* CTA */}
        <div className="text-center py-8 bg-primary/5 rounded-2xl mb-8">
          <h2 className="text-xl font-bold mb-2">Envie de planifier tes repas aussi facilement ?</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            NutriZen génère tes menus personnalisés en 3 minutes.
          </p>
          <a href={ctaUrl}>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Créer mes menus personnalisés gratuitement →
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

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, ChefHat, Clock, Flame, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import nutrizenLogo from '@/assets/nutrizen-main-logo.png';

interface SharedMeal {
  recipe_id: string;
  title: string;
  image_url: string | null;
  prep_min: number;
  total_min: number;
  calories: number;
  proteins_g?: number;
  carbs_g?: number;
  fats_g?: number;
  macros?: {
    proteins_g: number;
    carbs_g: number | null;
    fats_g: number | null;
  };
}

interface SharedDay {
  day_name: string;
  day_index: number;
  date: string;
  lunch: SharedMeal | null;
  dinner: SharedMeal | null;
}

interface SharedPlan {
  success: boolean;
  week_start: string;
  menu_id: string;
  days: SharedDay[];
  created_at: string;
  shared_by: {
    display_name: string;
    avatar_url: string | null;
  };
  error?: string;
}

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function SharedWeekPlan() {
  const { token } = useParams<{ token: string }>();
  const [plan, setPlan] = useState<SharedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Lien invalide.');
      setLoading(false);
      return;
    }

    const fetchPlan = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_shared_week_plan', {
          p_token: token,
        });

        if (rpcError) {
          console.error('RPC error:', rpcError);
          setError('Impossible de charger le menu partagé.');
          return;
        }

        const result = data as unknown as SharedPlan;

        if (result?.error) {
          setError(result.error);
          return;
        }

        if (result?.success) {
          setPlan(result);
        } else {
          setError('Menu introuvable.');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Erreur de connexion.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F9FFF9] to-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Chargement du menu partagé...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#F9FFF9] to-white p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-lg" style={{ borderRadius: '1.5rem' }}>
          <CardContent className="p-8">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-xl font-bold mb-2">Lien introuvable</h1>
            <p className="text-muted-foreground mb-6">{error || 'Ce lien de partage est invalide ou a expiré.'}</p>
            <Link to="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normalize days: the RPC returns payload.days which may be the flat array from user_weekly_menus
  const days: SharedDay[] = Array.isArray(plan.days)
    ? plan.days.map((day: any, i: number) => {
        // If it's already in day_name/lunch/dinner format
        if (day.day_name) return day;
        // If it's the flat format from user_weekly_menus
        return {
          day_name: day.day || WEEKDAYS[i] || `Jour ${i + 1}`,
          day_index: i,
          date: day.date || '',
          lunch: day.lunch || (day.title ? day : null),
          dinner: day.dinner || null,
        };
      })
    : [];

  const weekStartFormatted = new Date(plan.week_start).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F9FFF9] to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={nutrizenLogo} alt="NutriZen" className="h-8" />
          </Link>
          <Link to="/auth/signup">
            <Button size="sm" className="text-xs">
              Essayer NutriZen gratuitement
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            {plan.shared_by.avatar_url ? (
              <img
                src={plan.shared_by.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              Partagé par <strong>{plan.shared_by.display_name}</strong>
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            Ma semaine Zen 🍃
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            Semaine du {weekStartFormatted}
          </p>
        </div>

        {/* Meals Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
          {days.map((day, i) => (
            <Card
              key={i}
              className="border-0 shadow-md overflow-hidden"
              style={{
                borderRadius: '1.25rem',
                animation: `fadeSlideIn 0.4s ease-out ${i * 0.05}s both`,
              }}
            >
              <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{day.day_name}</span>
                  {day.date && (
                    <span className="text-xs text-muted-foreground font-normal">
                      {new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {day.lunch && <MealSlot meal={day.lunch} label="Déjeuner" />}
                {day.dinner && <MealSlot meal={day.dinner} label="Dîner" />}
                {!day.lunch && !day.dinner && (
                  <p className="text-sm text-muted-foreground text-center py-4">Pas de repas prévu</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center py-8 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl mb-8">
          <h2 className="text-xl font-bold mb-2">Envie de planifier tes repas aussi facilement ?</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            NutriZen génère tes menus personnalisés en 3 minutes.
          </p>
          <Link to="/auth/signup">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90">
              Essayer gratuitement
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
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

function MealSlot({ meal, label }: { meal: SharedMeal; label: string }) {
  const proteins = meal.macros?.proteins_g ?? meal.proteins_g ?? 0;
  const carbs = meal.macros?.carbs_g ?? meal.carbs_g ?? 0;
  const fats = meal.macros?.fats_g ?? meal.fats_g ?? 0;

  return (
    <div className="rounded-xl border bg-white p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <ChefHat className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>

      {meal.image_url && (
        <img
          src={meal.image_url}
          alt={meal.title}
          className="w-full h-28 object-cover rounded-lg"
          loading="lazy"
        />
      )}

      <p className="font-semibold text-sm leading-tight">{meal.title}</p>

      <div className="flex flex-wrap gap-1.5">
        {meal.prep_min > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
            <Clock className="h-3 w-3" /> {meal.prep_min} min
          </Badge>
        )}
        {meal.calories > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
            <Flame className="h-3 w-3" /> {meal.calories} kcal
          </Badge>
        )}
      </div>

      {(proteins > 0 || carbs > 0 || fats > 0) && (
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          <span>P: {Math.round(proteins)}g</span>
          <span>G: {Math.round(carbs || 0)}g</span>
          <span>L: {Math.round(fats || 0)}g</span>
        </div>
      )}
    </div>
  );
}

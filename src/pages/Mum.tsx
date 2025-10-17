import { useState } from 'react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Baby, Heart, Clock, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { toParisISO } from '@/lib/date-utils';
import { supabase } from '@/integrations/supabase/client';

const leadSchema = z.object({
  email: z.string().trim().email('Email invalide').max(255, 'L\'email ne peut pas dépasser 255 caractères')
});

export default function Mum() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      const validatedData = leadSchema.parse({ email });

      // Check rate limiting (max 3 submissions per hour)
      const rateLimitKey = 'nutrizen_mum_submissions';
      const now = Date.now();
      const submissions = JSON.parse(localStorage.getItem(rateLimitKey) || '[]');
      const recentSubmissions = submissions.filter((ts: number) => now - ts < 3600000);
      
      if (recentSubmissions.length >= 3) {
        toast({
          title: 'Trop de tentatives',
          description: 'Tu as atteint la limite d\'inscriptions. Réessaye dans une heure.',
          variant: 'destructive',
        });
        return;
      }

      // Submit via secure edge function
      const { error } = await supabase.functions.invoke('submit-lead', {
        body: {
          ...validatedData,
          source: 'nutrizen_mum',
          timestamp: toParisISO(),
        },
      });

      if (error) throw error;

      // Update rate limit
      localStorage.setItem(rateLimitKey, JSON.stringify([...recentSubmissions, now]));

      toast({
        title: '✅ Inscription réussie !',
        description: 'Tu recevras une alerte dès le lancement de NutriZen Mum.',
      });

      setEmail('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erreur de validation',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Impossible de t\'inscrire. Réessaye plus tard.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => navigate('/auth/signup')} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 bg-gradient-to-br from-accent/10 via-primary/5 to-background">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-accent font-medium">
                <Baby className="w-5 h-5" />
                <span>Bientôt disponible</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                NutriZen <span className="text-accent">Mum</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                L'assistant nutrition pour jeunes mamans. Repas équilibrés adaptés à la grossesse, l'allaitement et la récupération post-partum.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mt-12">
                <div className="p-6 bg-background rounded-lg border">
                  <Heart className="w-8 h-8 text-accent mb-3" />
                  <h3 className="font-semibold mb-2">Nutrition adaptée</h3>
                  <p className="text-sm text-muted-foreground">
                    Menus selon la phase : grossesse, allaitement, ou récupération
                  </p>
                </div>
                
                <div className="p-6 bg-background rounded-lg border">
                  <Clock className="w-8 h-8 text-accent mb-3" />
                  <h3 className="font-semibold mb-2">Gain de temps</h3>
                  <p className="text-sm text-muted-foreground">
                    Recettes rapides pour les journées chargées avec bébé
                  </p>
                </div>
                
                <div className="p-6 bg-background rounded-lg border">
                  <Sparkles className="w-8 h-8 text-accent mb-3" />
                  <h3 className="font-semibold mb-2">Énergie retrouvée</h3>
                  <p className="text-sm text-muted-foreground">
                    Apports nutritionnels optimisés pour ton bien-être
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lead Magnet */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-xl mx-auto text-center space-y-6">
              <h2 className="text-3xl font-bold">
                Reçois une alerte dès le lancement
              </h2>
              <p className="text-muted-foreground">
                Inscris-toi pour être parmi les premières à tester NutriZen Mum et bénéficier d'une offre de lancement exclusive.
              </p>
              
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton.email@exemple.fr"
                  required
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-accent to-primary text-white hover:scale-[1.02] transition-tech"
                >
                  {loading ? 'Envoi...' : 'M\'alerter'}
                </Button>
              </form>
              
              <p className="text-xs text-muted-foreground">
                Pas de spam. Juste une alerte quand c'est prêt. Promis.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Preview */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Ce qui t'attend avec NutriZen Mum
              </h2>
              
              <div className="space-y-6">
                <div className="flex gap-4 p-4 bg-background rounded-lg border">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                      1
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Profil personnalisé</h3>
                    <p className="text-sm text-muted-foreground">
                      Trimestre de grossesse, allaitement, ou post-partum
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-background rounded-lg border">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                      2
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Nutriments essentiels</h3>
                    <p className="text-sm text-muted-foreground">
                      Acide folique, fer, calcium, oméga-3 — tout est couvert
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-background rounded-lg border">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                      3
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Recettes express</h3>
                    <p className="text-sm text-muted-foreground">
                      Plats rapides à préparer même avec bébé dans les bras
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-background rounded-lg border">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                      4
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Conseils adaptés</h3>
                    <p className="text-sm text-muted-foreground">
                      Tips nutrition et bien-être selon ta phase de maternité
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-background rounded-lg border">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                      5
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Repas famille</h3>
                    <p className="text-sm text-muted-foreground">
                      Recettes adaptables pour toute la famille, même avec enfants
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

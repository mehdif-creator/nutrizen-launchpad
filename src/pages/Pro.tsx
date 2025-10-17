import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Briefcase, TrendingUp, Users, Clock } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useReferralTracking } from '@/hooks/useReferralTracking';

const leadSchema = z.object({
  email: z.string().email('Email invalide'),
});

export default function Pro() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Track referral codes from URL
  useReferralTracking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      leadSchema.parse({ email });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un email valide",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit (max 3 submissions per hour)
    const lastSubmissions = localStorage.getItem('lead_submissions');
    const now = Date.now();
    let submissions: number[] = lastSubmissions ? JSON.parse(lastSubmissions) : [];
    
    // Filter out submissions older than 1 hour
    submissions = submissions.filter(time => now - time < 3600000);
    
    if (submissions.length >= 3) {
      toast({
        title: "Trop de tentatives",
        description: "Veuillez réessayer dans une heure",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('submit-lead', {
        body: { 
          email,
          source: 'pro_landing'
        }
      });

      if (error) throw error;

      // Update rate limit tracking
      submissions.push(now);
      localStorage.setItem('lead_submissions', JSON.stringify(submissions));

      toast({
        title: "Inscription réussie !",
        description: "Nous vous tiendrons informé du lancement de NutriZen Pro",
      });

      setEmail('');
    } catch (error: any) {
      console.error('Error submitting lead:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => navigate('/auth/signup')} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
                Bientôt disponible
              </div>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                NutriZen Pro
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                L'assistant nutrition intelligent pour les professionnels de la santé
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
                <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-lg">
                  <Briefcase className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Gestion clients</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-lg">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Suivi détaillé</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-lg">
                  <Users className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Multi-patients</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-lg">
                  <Clock className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Gain de temps</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lead Magnet Section */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 md:p-12 shadow-elegant">
                <div className="text-center space-y-4 mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold">
                    Soyez parmi les premiers
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Inscrivez-vous pour être notifié du lancement et bénéficier d'une offre exclusive
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1"
                      required
                      disabled={isSubmitting}
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      size="lg"
                      className="bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] transition-tech shadow-glow"
                    >
                      {isSubmitting ? 'Envoi...' : 'Me notifier'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    En vous inscrivant, vous acceptez de recevoir des emails de NutriZen
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Features Preview */}
        <section className="py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                Fonctionnalités à venir
              </h2>
              
              <div className="space-y-8">
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Gestion de portefeuille clients</h3>
                    <p className="text-muted-foreground">
                      Gérez tous vos patients depuis une interface unique. Accédez rapidement à leur profil, historique et plans nutritionnels personnalisés.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Suivi détaillé et analytics</h3>
                    <p className="text-muted-foreground">
                      Visualisez l'évolution de vos patients avec des graphiques détaillés. Identifiez les tendances et ajustez les plans en temps réel.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Génération de rapports professionnels</h3>
                    <p className="text-muted-foreground">
                      Créez des rapports nutritionnels professionnels en quelques clics. Personnalisez-les selon vos besoins et partagez-les facilement.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Intégration calendrier et rendez-vous</h3>
                    <p className="text-muted-foreground">
                      Synchronisez vos consultations avec les plans nutritionnels. Envoyez des rappels automatiques et suivez l'assiduité de vos patients.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    5
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Base de données nutritionnelle complète</h3>
                    <p className="text-muted-foreground">
                      Accédez à une base de données exhaustive d'aliments et de recettes. Créez des plans personnalisés en fonction des besoins spécifiques de chaque patient.
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileSelect } from '@/components/ui/mobile-select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { t } from '@/i18n/translations';

/**
 * Post-checkout profile completion page
 * Collects essential user information to generate their first weekly menu
 */
export default function PostCheckoutProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingMenu, setGeneratingMenu] = useState(false);
  const [step, setStep] = useState<'profile' | 'generating' | 'complete'>('profile');

  const [formData, setFormData] = useState({
    age: '',
    sexe: '',
    niveau_activite: '',
    objectif_principal: '',
    type_alimentation: '',
    temps_preparation: '',
  });

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      navigate('/auth/login');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Validation
    if (!formData.age || !formData.sexe || !formData.objectif_principal) {
      toast({
        title: t('error.generic'),
        description: 'Merci de remplir tous les champs obligatoires.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Save preferences
      const { error: prefsError } = await supabase
        .from('preferences')
        .upsert({
          user_id: user.id,
          age: parseInt(formData.age),
          sexe: formData.sexe,
          niveau_activite: formData.niveau_activite,
          objectif_principal: formData.objectif_principal,
          type_alimentation: formData.type_alimentation || 'omnivore',
          temps_preparation: formData.temps_preparation || '30min',
        }, { onConflict: 'user_id' });

      if (prefsError) throw prefsError;

      // Trigger menu generation
      setStep('generating');
      setGeneratingMenu(true);

      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        const { error: menuError } = await supabase.functions.invoke('generate-menu', {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        });

        if (menuError) {
          console.error('Menu generation error:', menuError);
          // Don't fail the flow, just notify
          toast({
            title: 'Menu en cours de génération',
            description: 'Ton menu sera prêt dans quelques instants.',
          });
        }
      }

      setStep('complete');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/app/meal-plan');
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: t('error.generic'),
        description: 'Une erreur est survenue. Réessaye dans quelques instants.',
        variant: 'destructive',
      });
      setStep('profile');
    } finally {
      setLoading(false);
      setGeneratingMenu(false);
    }
  };

  if (!user) {
    return null;
  }

  // Generating state
  if (step === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">{t('menu.generating')}</h2>
            <p className="text-muted-foreground">{t('menu.generatingDesc')}</p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete state
  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{t('postCheckout.menuReady')}</h2>
            <p className="text-muted-foreground">Redirection vers ton menu...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{t('postCheckout.completeProfile')}</CardTitle>
          <CardDescription>{t('postCheckout.completeProfileDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Âge et Sexe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Âge *</Label>
                <Input
                  id="age"
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  placeholder="Ex: 30"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sexe">Sexe *</Label>
                <MobileSelect
                  id="sexe"
                  value={formData.sexe}
                  onValueChange={(v) => setFormData({...formData, sexe: v})}
                  placeholder={t('profile.select')}
                  options={[
                    { value: 'homme', label: t('profile.gender.male') },
                    { value: 'femme', label: t('profile.gender.female') },
                    { value: 'autre', label: t('profile.gender.other') },
                  ]}
                />
              </div>
            </div>

            {/* Niveau d'activité */}
            <div className="space-y-2">
              <Label htmlFor="niveau_activite">Niveau d'activité</Label>
              <MobileSelect
                id="niveau_activite"
                value={formData.niveau_activite}
                onValueChange={(v) => setFormData({...formData, niveau_activite: v})}
                placeholder={t('profile.select')}
                options={[
                  { value: 'sedentaire', label: t('profile.activityLevel.sedentary') },
                  { value: 'leger', label: t('profile.activityLevel.light') },
                  { value: 'modere', label: t('profile.activityLevel.moderate') },
                  { value: 'actif', label: t('profile.activityLevel.active') },
                  { value: 'sportif', label: t('profile.activityLevel.athlete') },
                ]}
              />
            </div>

            {/* Objectif principal */}
            <div className="space-y-2">
              <Label htmlFor="objectif_principal">Objectif principal *</Label>
              <MobileSelect
                id="objectif_principal"
                value={formData.objectif_principal}
                onValueChange={(v) => setFormData({...formData, objectif_principal: v})}
                placeholder={t('profile.select')}
                options={[
                  { value: 'perte_poids', label: 'Perte de poids' },
                  { value: 'maintien', label: 'Maintien' },
                  { value: 'prise_masse', label: 'Prise de masse' },
                  { value: 'equilibre', label: 'Équilibre alimentaire' },
                ]}
              />
            </div>

            {/* Type d'alimentation */}
            <div className="space-y-2">
              <Label htmlFor="type_alimentation">Type d'alimentation</Label>
              <MobileSelect
                id="type_alimentation"
                value={formData.type_alimentation}
                onValueChange={(v) => setFormData({...formData, type_alimentation: v})}
                placeholder={t('profile.select')}
                options={[
                  { value: 'omnivore', label: 'Omnivore' },
                  { value: 'vegetarien', label: 'Végétarien' },
                  { value: 'vegan', label: 'Vegan' },
                  { value: 'pescetarien', label: 'Pescétarien' },
                  { value: 'flexitarien', label: 'Flexitarien' },
                ]}
              />
            </div>

            {/* Temps de préparation */}
            <div className="space-y-2">
              <Label htmlFor="temps_preparation">Temps de préparation préféré</Label>
              <MobileSelect
                id="temps_preparation"
                value={formData.temps_preparation}
                onValueChange={(v) => setFormData({...formData, temps_preparation: v})}
                placeholder={t('profile.select')}
                options={[
                  { value: '15min', label: '15 min maximum' },
                  { value: '30min', label: '30 min maximum' },
                  { value: '45min', label: '45 min maximum' },
                  { value: '1h', label: '1h ou plus' },
                ]}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer mon premier menu
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              * Champs obligatoires
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

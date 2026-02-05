import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronRight, Users, Target, Utensils, AlertCircle } from 'lucide-react';
 import { completeOnboarding, updateOnboardingStatus, useOnboardingPageGuard } from '@/hooks/useOnboardingGuard';
import { MenuGenerationProgress } from '@/components/app/MenuGenerationProgress';
import { useAutoMenuGeneration } from '@/hooks/useAutoMenuGeneration';
import { queryClient } from '@/lib/queryClient';

const TOTAL_STEPS = 4;

interface ProfileData {
  household_adults: number;
  household_children: number;
  kid_portion_ratio: number;
  meals_per_day: number;
  portion_strategy: string;
  objectif_principal?: string;
  type_alimentation?: string;
  allergies?: string[];
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const menuGeneration = useAutoMenuGeneration();
   
   // Use the page guard - redirects to dashboard if already completed
   const { state: onboardingState } = useOnboardingPageGuard(user?.id);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMenuGeneration, setShowMenuGeneration] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    household_adults: 1,
    household_children: 0,
    kid_portion_ratio: 0.6,
    meals_per_day: 2,
    portion_strategy: 'household',
  });

   // Fetch profile data for the form (not status check - that's handled by guard)
  useEffect(() => {
    if (!user?.id) return;
     if (onboardingState === 'onboarded') return; // Guard will redirect

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
           .select('onboarding_step, required_fields_ok')
          .eq('id', user.id)
           .maybeSingle();

        if (error) {
           console.error('[Onboarding] Error fetching profile:', error);
          setLoading(false);
          return;
        }

         // Resume from saved step if exists
         if (data?.onboarding_step && data.onboarding_step >= 1) {
          setCurrentStep(Math.max(1, data.onboarding_step));
        }

        // Also fetch existing preferences
        const { data: prefs } = await supabase
          .from('preferences')
          .select('objectif_principal, type_alimentation, allergies')
          .eq('user_id', user.id)
          .single();

        if (prefs) {
          setProfileData(prev => ({
            ...prev,
            objectif_principal: prefs.objectif_principal || undefined,
            type_alimentation: prefs.type_alimentation || undefined,
            allergies: prefs.allergies || [],
          }));
        }

        // Fetch profile data
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('household_adults, household_children, kid_portion_ratio, meals_per_day, portion_strategy')
          .eq('id', user.id)
          .single();

        if (profile) {
          setProfileData(prev => ({
            ...prev,
            household_adults: profile.household_adults || 1,
            household_children: profile.household_children || 0,
            kid_portion_ratio: profile.kid_portion_ratio || 0.6,
            meals_per_day: profile.meals_per_day || 2,
            portion_strategy: profile.portion_strategy || 'household',
          }));
        }

        setLoading(false);
      } catch (error) {
         console.error('[Onboarding] Error:', error);
        setLoading(false);
      }
    };

    checkStatus();
   }, [user?.id, onboardingState]);

  const saveStep = async (step: number) => {
    if (!user?.id) return;

    setSaving(true);
    try {
      // Save profile data
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          household_adults: profileData.household_adults,
          household_children: profileData.household_children,
          kid_portion_ratio: profileData.kid_portion_ratio,
          meals_per_day: profileData.meals_per_day,
          portion_strategy: profileData.portion_strategy,
          onboarding_step: step,
          onboarding_status: step === 1 ? 'in_progress' : undefined,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Save preferences
      const { error: prefError } = await supabase
        .from('preferences')
        .upsert({
          user_id: user.id,
          objectif_principal: profileData.objectif_principal,
          type_alimentation: profileData.type_alimentation,
          allergies: profileData.allergies,
        }, { onConflict: 'user_id' });

      if (prefError) throw prefError;

      // Mark status as in_progress after first save
      if (step === 1) {
        await updateOnboardingStatus(user.id, { status: 'in_progress', step: 1 });
      }
    } catch (error) {
      console.error('[Onboarding] Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder. Réessaie.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    await saveStep(currentStep);
    
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      await handleCompleteOnboarding();
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      // Use the new completeOnboarding function which sets server truth
      const success = await completeOnboarding(user.id);
      
      if (!success) {
        throw new Error('Failed to complete onboarding');
      }

      toast({
        title: '🎉 Parfait, tout est prêt !',
        description: 'On génère ta première semaine de menus...',
      });

      // Show menu generation progress and start generation
      setShowMenuGeneration(true);
      const menuSuccess = await menuGeneration.generateMenu();
      
      // Invalidate dashboard queries so they refetch after navigation
      queryClient.invalidateQueries({ queryKey: ['userDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyRecipesByDay'] });
      
      // Wait a moment to show success state before navigating
      if (menuSuccess) {
        setTimeout(() => {
          navigate('/app/dashboard', { replace: true });
        }, 2000);
      }
    } catch (error) {
      console.error('[Onboarding] Complete error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de finaliser. Réessaie.',
      });
      setShowMenuGeneration(false);
    } finally {
      setSaving(false);
    }
  };

  // Handle menu generation retry
  const handleRetry = async () => {
    menuGeneration.reset();
    const success = await menuGeneration.generateMenu();
    if (success) {
      setTimeout(() => {
        navigate('/app/dashboard', { replace: true });
      }, 2000);
    }
  };

  // Skip menu generation and go to dashboard
  const handleSkip = () => {
    navigate('/app/dashboard', { replace: true });
  };

  // Show menu generation progress screen
  if (showMenuGeneration) {
    return (
      <MenuGenerationProgress
        status={menuGeneration.status}
        errorMessage={menuGeneration.errorMessage}
        onRetry={handleRetry}
        onSkip={handleSkip}
      />
    );
  }

   // If guard says onboarded, show redirect message briefly
   if (onboardingState === 'onboarded') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Profil déjà configuré</CardTitle>
            <CardDescription>
              Ton profil est déjà configuré. Tu peux le modifier dans les paramètres.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => navigate('/app/dashboard')} className="w-full">
              Aller au tableau de bord
            </Button>
            <Button onClick={() => navigate('/app/profile')} variant="outline" className="w-full">
              Modifier mon profil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

   // Show loading while guard is checking or data is loading
   if (loading || onboardingState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Configuration rapide</h1>
          <p className="text-muted-foreground">2 minutes pour personnaliser tes menus</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Étape {currentStep} sur {TOTAL_STEPS}</span>
            <span>{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
          </div>
          <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <StepHousehold 
                data={profileData} 
                onChange={setProfileData} 
              />
            )}
            {currentStep === 2 && (
              <StepGoals 
                data={profileData} 
                onChange={setProfileData} 
              />
            )}
            {currentStep === 3 && (
              <StepDiet 
                data={profileData} 
                onChange={setProfileData} 
              />
            )}
            {currentStep === 4 && (
              <StepConfirm data={profileData} />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || saving}
          >
            Retour
          </Button>
          <Button onClick={handleNext} disabled={saving}>
            {saving ? 'Enregistrement...' : currentStep === TOTAL_STEPS ? 'Terminer' : 'Suivant'}
            {!saving && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step 1: Household
function StepHousehold({ data, onChange }: { data: ProfileData; onChange: (d: ProfileData) => void }) {
  const adultsOptions = [1, 2, 3, 4, 5, 6].map(n => ({
    value: String(n),
    label: `${n} adulte${n > 1 ? 's' : ''}`
  }));
  
  const childrenOptions = [0, 1, 2, 3, 4, 5].map(n => ({
    value: String(n),
    label: `${n} enfant${n > 1 ? 's' : ''}`
  }));
  
  const ratioOptions = [
    { value: '0.5', label: '50% (petits enfants)' },
    { value: '0.6', label: '60% (enfants)' },
    { value: '0.7', label: '70% (pré-ados)' },
    { value: '0.8', label: '80% (adolescents)' },
    { value: '1', label: '100% (comme un adulte)' },
  ];
  
  const mealsOptions = [
    { value: '1', label: '1 repas (dîner uniquement)' },
    { value: '2', label: '2 repas (déjeuner + dîner)' },
    { value: '3', label: '3 repas (petit-déj + déj + dîner)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Ton foyer</h2>
          <p className="text-sm text-muted-foreground">Pour calculer les bonnes portions</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="adults">Nombre d'adultes</Label>
          <MobileSelect
            id="adults"
            value={String(data.household_adults)}
            onValueChange={(v) => onChange({ ...data, household_adults: parseInt(v) })}
            options={adultsOptions}
            placeholder="Sélectionne..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="children">Nombre d'enfants</Label>
          <MobileSelect
            id="children"
            value={String(data.household_children)}
            onValueChange={(v) => onChange({ ...data, household_children: parseInt(v) })}
            options={childrenOptions}
            placeholder="Sélectionne..."
          />
        </div>
      </div>

      {data.household_children > 0 && (
        <div className="space-y-2">
          <Label htmlFor="ratio">Part enfant (par rapport à un adulte)</Label>
          <MobileSelect
            id="ratio"
            value={String(data.kid_portion_ratio)}
            onValueChange={(v) => onChange({ ...data, kid_portion_ratio: parseFloat(v) })}
            options={ratioOptions}
            placeholder="Sélectionne..."
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="meals">Repas par jour</Label>
        <MobileSelect
          id="meals"
          value={String(data.meals_per_day)}
          onValueChange={(v) => onChange({ ...data, meals_per_day: parseInt(v) })}
          options={mealsOptions}
          placeholder="Sélectionne..."
        />
      </div>
    </div>
  );
}

// Step 2: Goals
function StepGoals({ data, onChange }: { data: ProfileData; onChange: (d: ProfileData) => void }) {
  const goals = [
    { value: 'equilibre', label: 'Manger équilibré', icon: '🥗' },
    { value: 'perte_poids', label: 'Perdre du poids', icon: '⚖️' },
    { value: 'gain_muscle', label: 'Prendre du muscle', icon: '💪' },
    { value: 'temps', label: 'Gagner du temps', icon: '⏱️' },
    { value: 'budget', label: 'Réduire mon budget', icon: '💰' },
    { value: 'decouverte', label: 'Découvrir de nouvelles recettes', icon: '🍽️' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Ton objectif principal</h2>
          <p className="text-sm text-muted-foreground">Cela influence les recettes proposées</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {goals.map((goal) => (
          <button
            key={goal.value}
            onClick={() => onChange({ ...data, objectif_principal: goal.value })}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              data.objectif_principal === goal.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="text-2xl mr-2">{goal.icon}</span>
            <span className="font-medium">{goal.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 3: Diet
function StepDiet({ data, onChange }: { data: ProfileData; onChange: (d: ProfileData) => void }) {
  const diets = [
    { value: 'omnivore', label: 'Omnivore', desc: 'Je mange de tout' },
    { value: 'flexitarien', label: 'Flexitarien', desc: 'Peu de viande' },
    { value: 'vegetarien', label: 'Végétarien', desc: 'Pas de viande ni poisson' },
    { value: 'vegan', label: 'Vegan', desc: 'Aucun produit animal' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Utensils className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Ton régime alimentaire</h2>
          <p className="text-sm text-muted-foreground">Pour filtrer les recettes</p>
        </div>
      </div>

      <div className="space-y-3">
        {diets.map((diet) => (
          <button
            key={diet.value}
            onClick={() => onChange({ ...data, type_alimentation: diet.value })}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              data.type_alimentation === diet.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-medium">{diet.label}</div>
            <div className="text-sm text-muted-foreground">{diet.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 4: Confirm
function StepConfirm({ data }: { data: ProfileData }) {
  const effectivePortions = data.household_adults + (data.household_children * data.kid_portion_ratio);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-500/10 rounded-lg">
          <Check className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Récapitulatif</h2>
          <p className="text-sm text-muted-foreground">Vérifie tes choix avant de terminer</p>
        </div>
      </div>

      <div className="space-y-4 bg-muted/30 rounded-xl p-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Foyer</span>
          <span className="font-medium">
            {data.household_adults} adulte{data.household_adults > 1 ? 's' : ''}
            {data.household_children > 0 && `, ${data.household_children} enfant${data.household_children > 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Portions effectives</span>
          <span className="font-medium">{effectivePortions.toFixed(1)} parts</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Repas/jour</span>
          <span className="font-medium">{data.meals_per_day}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Objectif</span>
          <span className="font-medium capitalize">{data.objectif_principal?.replace('_', ' ') || 'Non défini'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Régime</span>
          <span className="font-medium capitalize">{data.type_alimentation || 'Non défini'}</span>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg text-sm">
        <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <span className="text-muted-foreground">
          Tu pourras modifier ces informations à tout moment dans les paramètres.
        </span>
      </div>
    </div>
  );
}

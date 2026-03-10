import { useState, useEffect, useMemo } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Target, Utensils, AlertTriangle, Leaf, Scale, Users, Heart, Save, Baby, ChevronDown } from 'lucide-react';
import { MealCardSection, type MealConfig } from '@/components/app/MealCardSection';
import { Separator } from '@/components/ui/separator';
import { InfoBanner } from '@/components/common/InfoBanner';
import { X } from 'lucide-react';

/** Age-based child portion coefficient */
function childPortionCoeff(age: number): number {
  if (age <= 3) return 0.3;
  if (age <= 8) return 0.5;
  if (age <= 13) return 0.7;
  return 1.0;
}

// ── Allergie type for JSONB ──
interface AllergyEntry {
  name: string;
  type: 'allergie' | 'intolerance';
  traces_ok: boolean;
}

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');

  // ── Section 1: user_profile ──
  const [gender, setGender] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [weightDeadline, setWeightDeadline] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [sportFrequency, setSportFrequency] = useState('');
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);

  // ── Section 2: user_objectives ──
  const [mainGoal, setMainGoal] = useState('');
  const [goalDuration, setGoalDuration] = useState('');
  const [mainBlockers, setMainBlockers] = useState<string[]>([]);

  // ── Section 3: user_eating_habits ──
  const [mealsPerDay, setMealsPerDay] = useState<number | null>(null);
  const [appetiteSize, setAppetiteSize] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [batchCooking, setBatchCooking] = useState('');
  const [cookingLevel, setCookingLevel] = useState('');
  const [mealFrequency, setMealFrequency] = useState('');
  const [availableTools, setAvailableTools] = useState<string[]>([]);

  // ── Section 3b: user_meals_config ──
  const [meals, setMeals] = useState<MealConfig[]>([]);

  // ── Section 4: user_allergies ──
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [allergieTypes, setAllergieTypes] = useState<Record<string, 'allergie' | 'intolerance'>>({});
  const [tracesAccepted, setTracesAccepted] = useState(false);
  const [otherAllergies, setOtherAllergies] = useState('');

  // ── Section 5: user_food_style ──
  const [dietType, setDietType] = useState('');
  const [foodsToAvoid, setFoodsToAvoid] = useState<string[]>([]);
  const [favoriteIngredients, setFavoriteIngredients] = useState<string[]>([]);
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState('');
  const [cookingMethod, setCookingMethod] = useState<string[]>([]);
  const [preferOrganic, setPreferOrganic] = useState(false);
  const [reduceSugar, setReduceSugar] = useState(false);
  const [preferSeasonal, setPreferSeasonal] = useState(false);
  const [bioLocal, setBioLocal] = useState('');
  const [saltLevel, setSaltLevel] = useState('');

  // ── Section 6: user_nutrition_goals ──
  const [caloricGoal, setCaloricGoal] = useState('');
  const [targetKcal, setTargetKcal] = useState<number | null>(null);
  const [macrosCustom, setMacrosCustom] = useState(false);
  const [macroDistribution, setMacroDistribution] = useState('');
  const [proteinGPerKg, setProteinGPerKg] = useState<number | null>(null);
  const [trackFiber, setTrackFiber] = useState(false);
  const [dairyPreference, setDairyPreference] = useState('');

  // ── Section 7: user_household ──
  const [householdAdults, setHouseholdAdults] = useState(1);
  const [householdChildren, setHouseholdChildren] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [familyAllergies, setFamilyAllergies] = useState('');

  // ── Section 8: user_lifestyle ──
  const [workType, setWorkType] = useState('');
  const [scheduleType, setScheduleType] = useState('');
  const [stressLevel, setStressLevel] = useState('');
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [mainMotivation, setMainMotivation] = useState('');
  const [weeklyBudget, setWeeklyBudget] = useState('');
  const [shoppingLocation, setShoppingLocation] = useState('');
  const [shoppingFrequency, setShoppingFrequency] = useState('');
  const [sportAdvice, setSportAdvice] = useState(true);

  // Sync childAges array length with householdChildren
  useEffect(() => {
    setChildAges((prev) => {
      if (prev.length === householdChildren) return prev;
      if (householdChildren > prev.length) {
        return [...prev, ...Array(householdChildren - prev.length).fill(5)];
      }
      return prev.slice(0, householdChildren);
    });
  }, [householdChildren]);

  const effectivePortions = useMemo(() => {
    const adultPortions = householdAdults;
    const childPortions = childAges.reduce((s, a) => s + childPortionCoeff(a), 0);
    return adultPortions + childPortions;
  }, [householdAdults, childAges]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [
        { data: profile },
        { data: objectives },
        { data: eating },
        { data: mealsConfig },
        { data: allergies },
        { data: foodStyle },
        { data: nutrition },
        { data: household },
        { data: lifestyle },
      ] = await Promise.all([
        supabase.from('user_profile').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_objectives').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_eating_habits').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_meals_config').select('*').eq('user_id', user.id),
        supabase.from('user_allergies').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_food_style').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_household').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_lifestyle').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      // Section 1 — reverse map medical codes to display labels
      if (profile) {
        setGender(profile.gender || '');
        setAge(profile.age);
        setHeightCm(profile.height_cm);
        setCurrentWeight(profile.current_weight ? Number(profile.current_weight) : null);
        setTargetWeight(profile.target_weight ? Number(profile.target_weight) : null);
        setWeightDeadline(profile.weight_deadline || '');
        setActivityLevel(profile.activity_level || '');
        setSportFrequency(profile.sport_frequency || '');
        const MEDICAL_CODE_TO_LABEL: Record<string, string> = {
          'diabete_2': 'Diabète type 2',
          'hypertension': 'Hypertension',
          'cholesterol': 'Cholestérol élevé',
          'hypothyroidie': 'Hypothyroïdie',
          'aucune': 'Aucune',
          'autre': 'Autre',
        };
        const rawConditions: string[] = profile.medical_conditions || [];
        setMedicalConditions(rawConditions.map((c: string) => MEDICAL_CODE_TO_LABEL[c] || c));
      }

      // Section 2
      if (objectives) {
        setMainGoal(objectives.main_goal || '');
        setGoalDuration(objectives.goal_duration || '');
        setMainBlockers(objectives.main_blockers || []);
      }

      // Section 3 — reverse map prep_time codes
      if (eating) {
        setMealsPerDay(eating.meals_per_day);
        setAppetiteSize(eating.appetite_size || '');
        const PREP_CODE_TO_FORM: Record<string, string> = {
          '15min': 'moins_10',
          '15_30min': '10_20',
          '30_45min': '20_40',
          '45min_plus': 'plus_40',
        };
        const rawPrepTime = eating.prep_time?.[0] || '';
        setPrepTime(PREP_CODE_TO_FORM[rawPrepTime] || rawPrepTime);
        setBatchCooking(eating.batch_cooking || '');
        setCookingLevel(eating.cooking_level || '');
        setMealFrequency(eating.meal_frequency || '');
        setAvailableTools(eating.available_tools || []);
      }

      // Section 3b: meals config
      if (mealsConfig && mealsConfig.length > 0) {
        const loaded: MealConfig[] = mealsConfig.map((m: any) => ({
          type: m.meal_type as 'dejeuner' | 'diner',
          heure: m.meal_time ? String(m.meal_time).slice(0, 5) : (m.meal_type === 'dejeuner' ? '12:30' : '19:30'),
          quiMange: m.who_eats === 'famille' ? 'tous' : (m.who_eats || 'tous'),
          membresSelectionnes: m.who_eats_custom || [],
          portionsOverride: m.portions_manual ? Number(m.portions) : null,
          lieu: m.location || 'maison',
        }));
        setMeals(loaded);
      }

      // Section 4
      if (allergies) {
        const entries: AllergyEntry[] = Array.isArray(allergies.allergies) ? allergies.allergies as unknown as AllergyEntry[] : [];
        setSelectedAllergies(entries.map(e => e.name));
        const types: Record<string, 'allergie' | 'intolerance'> = {};
        entries.forEach(e => { types[e.name] = e.type; });
        setAllergieTypes(types);
        setTracesAccepted(allergies.traces_accepted || false);
        setOtherAllergies(allergies.other_allergies || '');
      }

      // Section 5
      if (foodStyle) {
        setDietType(foodStyle.diet_type || '');
        setFoodsToAvoid(foodStyle.foods_to_avoid || []);
        setFavoriteIngredients(foodStyle.favorite_ingredients || []);
        setFavoriteCuisines(foodStyle.favorite_cuisines || []);
        setSpiceLevel(foodStyle.spice_level || '');
        setCookingMethod(Array.isArray(foodStyle.cooking_method) ? foodStyle.cooking_method : foodStyle.cooking_method ? [foodStyle.cooking_method] : []);
        setPreferOrganic(foodStyle.prefer_organic || false);
        setReduceSugar(foodStyle.reduce_sugar || false);
        setPreferSeasonal(foodStyle.prefer_seasonal || false);
        setBioLocal(foodStyle.bio_local || '');
        // salt level stored in food_style column doesn't exist - keep from spice_level area
      }

      // Section 6
      if (nutrition) {
        setCaloricGoal(nutrition.caloric_goal || '');
        setTargetKcal(nutrition.target_kcal);
        setMacrosCustom(nutrition.macros_custom || false);
        setProteinGPerKg(null); // derived field
        setTrackFiber(nutrition.track_fiber || false);
        setDairyPreference(nutrition.dairy_preference || '');
      }

      // Section 7
      if (household) {
        setHouseholdAdults(household.adults_count ?? 1);
        setHouseholdChildren(household.children_count ?? 0);
        if (household.children_ages && household.children_ages.length > 0) {
          setChildAges(household.children_ages);
        }
        setFamilyAllergies(household.family_allergies || '');
      }

      // Section 8
      if (lifestyle) {
        setWorkType(lifestyle.work_type || '');
        setScheduleType(lifestyle.schedule_type || '');
        setStressLevel(lifestyle.stress_level || '');
        setSleepHours(lifestyle.sleep_hours ? Number(lifestyle.sleep_hours) : null);
        setMainMotivation(lifestyle.main_motivation || '');
        setWeeklyBudget(lifestyle.weekly_budget_food || '');
        setShoppingLocation(lifestyle.shopping_location || '');
        setShoppingFrequency(lifestyle.shopping_frequency || '');
        setSportAdvice(lifestyle.sport_advice ?? true);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map display labels → DB codes for medical conditions
  const MEDICAL_LABEL_TO_CODE: Record<string, string> = {
    'Diabète type 2': 'diabete_2',
    'Hypertension': 'hypertension',
    'Cholestérol élevé': 'cholesterol',
    'Hypothyroïdie': 'hypothyroidie',
    'Aucune': 'aucune',
    'Autre': 'autre',
  };
  const MEDICAL_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
    Object.entries(MEDICAL_LABEL_TO_CODE).map(([k, v]) => [v, k])
  );

  // Map form prep_time values → DB codes for edge function
  const PREP_TIME_TO_CODE: Record<string, string> = {
    'moins_10': '15min',
    '10_20': '15_30min',
    '20_40': '30_45min',
    'plus_40': '45min_plus',
  };
  const PREP_CODE_TO_FORM: Record<string, string> = Object.fromEntries(
    Object.entries(PREP_TIME_TO_CODE).map(([k, v]) => [v, k])
  );

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Erreur', description: 'Vous devez être connecté pour sauvegarder vos préférences.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    setSaveError('');
    const now = new Date().toISOString();

    try {
      // Build allergies JSONB
      const allergiesJsonb: AllergyEntry[] = selectedAllergies.map(name => ({
        name,
        type: allergieTypes[name] || 'allergie',
        traces_ok: tracesAccepted,
      }));

      // Convert medical conditions from display labels to DB codes
      const medicalCodes = medicalConditions
        .map(label => MEDICAL_LABEL_TO_CODE[label] || label)
        .filter(c => c !== 'aucune');

      // Convert prep_time from form value to DB code
      const prepTimeCode = PREP_TIME_TO_CODE[prepTime] || prepTime;

      // Build meals config upserts
      const mealsUpserts = meals.map(m => ({
        user_id: user.id,
        meal_type: m.type,
        meal_time: m.heure + ':00',
        who_eats: m.quiMange === 'tous' ? 'famille' : m.quiMange,
        who_eats_custom: m.quiMange === 'personnalise' ? m.membresSelectionnes : [],
        portions: m.portionsOverride ?? effectivePortions,
        portions_manual: m.portionsOverride !== null,
        location: m.lieu,
        generate_recipe: m.lieu !== 'ecole' && m.lieu !== 'restaurant',
        updated_at: now,
      }));

      const results = await Promise.all([
        supabase.from('user_profile').upsert({
          user_id: user.id,
          gender,
          age,
          height_cm: heightCm,
          current_weight: currentWeight,
          target_weight: targetWeight,
          weight_deadline: weightDeadline || null,
          activity_level: activityLevel || null,
          sport_frequency: sportFrequency || null,
          medical_conditions: medicalCodes.length > 0 ? medicalCodes : null,
          updated_at: now,
        }, { onConflict: 'user_id' }),

        supabase.from('user_objectives').upsert({
          user_id: user.id,
          main_goal: mainGoal || null,
          goal_duration: goalDuration || null,
          main_blockers: mainBlockers.length > 0 ? mainBlockers : null,
          updated_at: now,
        }, { onConflict: 'user_id' }),

        supabase.from('user_eating_habits').upsert({
          user_id: user.id,
          meals_per_day: mealsPerDay,
          appetite_size: appetiteSize || null,
          prep_time: prepTimeCode ? [prepTimeCode] : null,
          batch_cooking: batchCooking || null,
          cooking_level: cookingLevel || null,
          cooking_frequency: null,
          available_tools: availableTools.length > 0 ? availableTools : null,
          meal_frequency: mealFrequency || null,
          updated_at: now,
        }, { onConflict: 'user_id' }),

        supabase.from('user_allergies').upsert({
          user_id: user.id,
          allergies: allergiesJsonb as any,
          other_allergies: otherAllergies || null,
          traces_accepted: tracesAccepted,
          updated_at: now,
        }, { onConflict: 'user_id' }),

        supabase.from('user_food_style').upsert({
          user_id: user.id,
          diet_type: dietType || null,
          foods_to_avoid: foodsToAvoid.length > 0 ? foodsToAvoid : null,
          favorite_ingredients: favoriteIngredients.length > 0 ? favoriteIngredients : null,
          favorite_cuisines: favoriteCuisines.length > 0 ? favoriteCuisines : null,
          spice_level: spiceLevel || null,
          cooking_method: cookingMethod.length > 0 ? cookingMethod[0] : null,
          prefer_organic: preferOrganic,
          reduce_sugar: reduceSugar,
          prefer_seasonal: preferSeasonal,
          bio_local: bioLocal || null,
          updated_at: now,
        }, { onConflict: 'user_id' }),

        supabase.from('user_nutrition_goals').upsert({
          user_id: user.id,
          caloric_goal: caloricGoal || null,
          target_kcal: targetKcal,
          macros_custom: macrosCustom,
          macro_protein_pct: 30,
          macro_carbs_pct: 45,
          macro_fat_pct: 25,
          dairy_preference: dairyPreference || null,
          track_fiber: trackFiber,
          updated_at: now,
        }, { onConflict: 'user_id' }),

        supabase.from('user_household').upsert({
          user_id: user.id,
          adults_count: householdAdults,
          children_count: householdChildren,
          children_ages: childAges.length > 0 ? childAges : null,
          total_portions: effectivePortions,
          family_allergies: familyAllergies || null,
          updated_at: now,
        }, { onConflict: 'user_id' }),

        supabase.from('user_lifestyle').upsert({
          user_id: user.id,
          stress_level: stressLevel || null,
          sleep_hours: sleepHours,
          main_motivation: mainMotivation || null,
          work_type: workType || null,
          schedule_type: scheduleType || null,
          weekly_budget_food: weeklyBudget || null,
          shopping_frequency: shoppingFrequency || null,
          shopping_location: shoppingLocation || null,
          sport_advice: sportAdvice,
          updated_at: now,
        }, { onConflict: 'user_id' }),
      ]);

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Save errors:', errors.map(e => e.error));
        throw new Error(errors[0].error!.message);
      }

      // Upsert meals config: delete old then insert new (sequential for atomicity)
      await supabase.from('user_meals_config').delete().eq('user_id', user.id);
      if (mealsUpserts.length > 0) {
        const { error: mealsErr } = await supabase.from('user_meals_config').insert(mealsUpserts);
        if (mealsErr) {
          console.error('Meals config save error:', mealsErr);
          throw new Error(mealsErr.message);
        }
      }

      // Also sync to legacy preferences + profiles for backward compat
      await Promise.all([
        supabase.from('preferences').upsert({
          user_id: user.id,
          sexe: gender,
          age,
          taille_cm: heightCm,
          poids_actuel_kg: currentWeight,
          poids_souhaite_kg: targetWeight,
          niveau_activite: activityLevel,
          objectif_principal: mainGoal,
          repas_par_jour: mealsPerDay,
          temps_preparation: prepTimeCode,
          batch_cooking: batchCooking,
          niveau_cuisine: cookingLevel,
          ustensiles: availableTools,
          allergies: selectedAllergies,
          autres_allergies: otherAllergies,
          type_alimentation: dietType,
          aliments_eviter: foodsToAvoid,
          ingredients_favoris: favoriteIngredients,
          cuisine_preferee: favoriteCuisines,
          niveau_epices: spiceLevel,
          mode_cuisson_prefere: cookingMethod,
          produits_bio_locaux: bioLocal,
          limiter_sucre: reduceSugar,
          objectif_calorique: caloricGoal,
          apport_proteines_g_kg: proteinGPerKg,
          recettes_riches_fibres: trackFiber,
          produits_laitiers: dairyPreference,
          taille_portion: appetiteSize,
          nombre_enfants: householdChildren,
          age_enfants: childAges,
          autres_adultes: Math.max(0, householdAdults - 1),
          niveau_stress: stressLevel,
          sommeil_heures: sleepHours,
          motivation_principale: mainMotivation,
          budget_hebdomadaire: weeklyBudget,
          lieu_courses: shoppingLocation,
          frequence_courses: shoppingFrequency,
          conseils_lifestyle: sportAdvice,
          appliances_owned: availableTools,
          updated_at: now,
        }, { onConflict: 'user_id' }),
        supabase.from('profiles').update({
          household_adults: householdAdults,
          household_children: householdChildren,
          meals_per_day: mealsPerDay,
        }).eq('id', user.id),
      ]);

      toast({
        title: '✅ Vos préférences ont bien été enregistrées !',
        description: 'Votre menu se régénère avec vos nouvelles préférences...',
      });

      // Mark current menus as needing regeneration + trigger regeneration
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          // Flag existing menus as needing regeneration
          await supabase
            .from('user_weekly_menus')
            .update({ needs_regeneration: true })
            .eq('user_id', user.id);

          const { error: menuErr } = await supabase.functions.invoke('generate-menu', {
            headers: { Authorization: `Bearer ${session.session.access_token}` },
          });
          if (menuErr) {
            console.error('Edge Function error (generate-menu):', menuErr);
          } else {
            toast({ title: '🎉 Menu mis à jour !', description: 'Votre menu hebdomadaire a été régénéré avec vos nouvelles préférences.' });
          }
        }
      } catch (menuError) {
        console.error('Error regenerating menu:', menuError);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      const msg = error instanceof Error ? error.message : 'Impossible de sauvegarder vos préférences. Réessayez plus tard.';
      setSaveError(msg);
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle helpers
  const toggleInArray = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setArr(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]);
  };

  const updateTextField = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    const newArr = [...arr];
    if (value) { newArr[index] = value; } else { newArr.splice(index, 1); }
    setArr(newArr.filter(Boolean));
  };

  const FOOD_SUGGESTIONS = [
    'Avocat', 'Brocoli', 'Saumon', 'Tofu', 'Riz complet', 'Pâtes', 'Lentilles',
    'Quinoa', 'Épinards', 'Poulet', 'Banane', 'Amandes',
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-muted-foreground">Chargement de vos préférences...</p>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />

      <main className="flex-1 container py-4 md:py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Vos préférences</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Commencez par votre foyer, puis renseignez vos préférences pour des menus parfaitement adaptés.
            </p>
          </div>

          <Accordion type="multiple" defaultValue={[
            // Open "Votre foyer" by default if no household data saved yet
            ...(householdAdults <= 1 && householdChildren === 0 ? ["section_foyer"] : []),
            "section1", "section2"
          ]} className="space-y-4">

            {/* ═══════════ Section 0: Votre foyer (FIRST) ═══════════ */}
            <AccordionItem value="section_foyer">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-primary" />
                      Votre foyer
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <HouseholdBanner />
                    <p className="text-sm text-muted-foreground">
                      Les portions de vos menus et votre liste de courses seront automatiquement adaptées à la composition de votre foyer.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="hh_adults" className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Nombre d'adultes</Label>
                        <Input id="hh_adults" type="number" min={0} max={10} step={1} value={householdAdults} onChange={(e) => setHouseholdAdults(Math.max(0, parseInt(e.target.value) || 0))} className="text-center text-lg font-semibold" />
                        <p className="text-xs text-muted-foreground">1 portion = 1 adulte</p>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="hh_children" className="flex items-center gap-2"><Baby className="h-4 w-4 text-muted-foreground" />Nombre d'enfants</Label>
                        <Input id="hh_children" type="number" min={0} max={10} step={1} value={householdChildren} onChange={(e) => setHouseholdChildren(Math.max(0, parseInt(e.target.value) || 0))} className="text-center text-lg font-semibold" />
                      </div>
                    </div>

                    {householdChildren > 0 && (
                      <div className="space-y-3">
                        <Label>Âge de chaque enfant</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {childAges.map((ca, idx) => (
                            <div key={idx} className="space-y-1">
                              <Label htmlFor={`child_age_${idx}`} className="text-xs text-muted-foreground">Enfant {idx + 1}</Label>
                              <Input id={`child_age_${idx}`} type="number" min={0} max={18} value={ca} onChange={(e) => { const n = [...childAges]; n[idx] = parseInt(e.target.value) || 0; setChildAges(n); }} className="text-center" />
                              <p className="text-[10px] text-muted-foreground text-center">Coeff : {childPortionCoeff(ca)}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">0-3 ans = 0.3 · 4-8 ans = 0.5 · 9-13 ans = 0.7 · 14+ ans = 1.0</p>
                      </div>
                    )}

                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Portions équivalentes</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {householdAdults} adulte{householdAdults > 1 ? 's' : ''}
                            {householdChildren > 0 && ` + ${householdChildren} enfant${householdChildren > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{effectivePortions.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">portions</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="family_allergies">Allergies des proches</Label>
                      <Input id="family_allergies" value={familyAllergies} onChange={(e) => setFamilyAllergies(e.target.value)} placeholder="Ex : Arachides, gluten..." />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* ═══════════ Section 1: Votre profil ═══════════ */}
            <AccordionItem value="section1">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-5 h-5 text-primary" />
                      Votre profil
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Sexe</Label>
                      <RadioGroup value={gender} onValueChange={setGender}>
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="homme" id="homme" /><Label htmlFor="homme">Homme</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="femme" id="femme" /><Label htmlFor="femme">Femme</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="autre" id="autre" /><Label htmlFor="autre">Autre</Label></div>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Âge</Label>
                        <Input id="age" type="number" min="1" max="120" value={age || ''} onChange={(e) => setAge(parseInt(e.target.value) || null)} placeholder="Ex : 30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taille">Taille (cm)</Label>
                        <Input id="taille" type="number" min="50" max="250" value={heightCm || ''} onChange={(e) => setHeightCm(parseInt(e.target.value) || null)} placeholder="Ex : 170" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="poids_actuel">Poids actuel (kg)</Label>
                        <Input id="poids_actuel" type="number" step="0.1" value={currentWeight || ''} onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || null)} placeholder="Ex : 70" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="poids_souhaite">Poids souhaité (kg)</Label>
                        <Input id="poids_souhaite" type="number" step="0.1" value={targetWeight || ''} onChange={(e) => setTargetWeight(parseFloat(e.target.value) || null)} placeholder="Ex : 65" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delai_poids">En combien de temps ?</Label>
                        <MobileSelect id="delai_poids" value={weightDeadline} onValueChange={setWeightDeadline} placeholder="Sélectionnez..." options={[
                          { value: '1_mois', label: '1 mois' },
                          { value: '3_mois', label: '3 mois' },
                          { value: '6_mois', label: '6 mois' },
                          { value: 'sans_delai', label: 'Sans délai précis' },
                        ]} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="niveau_activite">Niveau d'activité</Label>
                        <MobileSelect id="niveau_activite" value={activityLevel} onValueChange={setActivityLevel} placeholder="Sélectionnez..." options={[
                          { value: 'sedentaire', label: 'Sédentaire' },
                          { value: 'leger', label: 'Léger' },
                          { value: 'modere', label: 'Modéré' },
                          { value: 'actif', label: 'Actif' },
                          { value: 'tres_actif', label: 'Très actif' },
                        ]} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sport_freq">Fréquence de sport</Label>
                        <MobileSelect id="sport_freq" value={sportFrequency} onValueChange={setSportFrequency} placeholder="Sélectionnez..." options={[
                          { value: 'rarement', label: 'Rarement' },
                          { value: '1_2', label: '1-2 fois/sem' },
                          { value: '3_4', label: '3-4 fois/sem' },
                          { value: 'quotidien', label: 'Quotidien' },
                        ]} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Conditions médicales</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['Aucune', 'Diabète type 2', 'Hypertension', 'Cholestérol élevé', 'Hypothyroïdie', 'Autre'].map((cond) => (
                          <div key={cond} className="flex items-center space-x-2">
                            <Checkbox id={`cond_${cond}`} checked={medicalConditions.includes(cond)}
                              onCheckedChange={() => {
                                if (cond === 'Aucune') { setMedicalConditions(medicalConditions.includes('Aucune') ? [] : ['Aucune']); }
                                else { setMedicalConditions(prev => { const filtered = prev.filter(c => c !== 'Aucune'); return filtered.includes(cond) ? filtered.filter(c => c !== cond) : [...filtered, cond]; }); }
                              }}
                            />
                            <Label htmlFor={`cond_${cond}`} className="text-sm">{cond}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* ═══════════ Section 2: Vos objectifs ═══════════ */}
            <AccordionItem value="section2">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="w-5 h-5 text-primary" />
                      Vos objectifs
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Objectif principal</Label>
                      <RadioGroup value={mainGoal} onValueChange={setMainGoal}>
                        <div className="space-y-2">
                          {[
                            { value: 'perte_poids', label: 'Perte de poids' },
                            { value: 'prise_muscle', label: 'Prise de muscle' },
                            { value: 'equilibre', label: 'Alimentation équilibrée' },
                            { value: 'energie', label: "Plus d'énergie" },
                            { value: 'grossesse', label: 'Grossesse / Récupération' },
                          ].map((obj) => (
                            <div key={obj.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={obj.value} id={obj.value} />
                              <Label htmlFor={obj.value}>{obj.label}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duree">Durée souhaitée</Label>
                      <Select value={goalDuration} onValueChange={setGoalDuration}>
                        <SelectTrigger id="duree"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="court_terme">Court terme (1-4 semaines)</SelectItem>
                          <SelectItem value="long_terme">Long terme (3+ mois)</SelectItem>
                          <SelectItem value="sans_limite">Sans limite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Vos principaux freins</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Manque de temps', "Manque d'idées", 'Budget limité', 'Manque de motivation', 'Difficultés à cuisiner', 'Famille difficile à satisfaire'].map((frein) => (
                          <button key={frein} type="button" onClick={() => toggleInArray(mainBlockers, setMainBlockers, frein)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${mainBlockers.includes(frein) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-accent'}`}>
                            {frein}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* ═══════════ Section 3: Habitudes alimentaires ═══════════ */}
            <AccordionItem value="section3">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Utensils className="w-5 h-5 text-primary" />
                      Vos habitudes alimentaires
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="repas_jour">Nombre de repas par jour</Label>
                        <Select value={mealsPerDay?.toString() || ''} onValueChange={(v) => setMealsPerDay(parseInt(v))}>
                          <SelectTrigger id="repas_jour"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                          <SelectContent>
                            {[1, 2].map(n => (<SelectItem key={n} value={n.toString()}>{n}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="appetit">Taille d'appétit</Label>
                        <MobileSelect id="appetit" value={appetiteSize} onValueChange={setAppetiteSize} placeholder="Sélectionnez..." options={[
                          { value: 'petit', label: 'Petit appétit' },
                          { value: 'normal', label: 'Appétit normal' },
                          { value: 'grand', label: 'Grand appétit' },
                        ]} />
                      </div>
                    </div>

                    <MealCardSection
                      repasParJour={mealsPerDay}
                      meals={meals}
                      onMealsChange={setMeals}
                      adults={householdAdults}
                      childrenAges={childAges}
                    />

                    <div className="space-y-2">
                      <Label>Temps de préparation souhaité</Label>
                      <RadioGroup value={prepTime} onValueChange={setPrepTime}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { value: 'moins_10', label: '<10 min' },
                            { value: '10_20', label: '10-20 min' },
                            { value: '20_40', label: '20-40 min' },
                            { value: 'plus_40', label: '+40 min' },
                          ].map((t) => (
                            <div key={t.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={t.value} id={t.value} />
                              <Label htmlFor={t.value}>{t.label}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label>Préférez-vous le batch cooking ?</Label>
                      <RadioGroup value={batchCooking} onValueChange={setBatchCooking}>
                        <div className="flex gap-4">
                          {['oui', 'non', 'parfois'].map((v) => (
                            <div key={v} className="flex items-center space-x-2">
                              <RadioGroupItem value={v} id={`batch_${v}`} />
                              <Label htmlFor={`batch_${v}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="niveau_cuisine">Niveau en cuisine</Label>
                        <Select value={cookingLevel} onValueChange={setCookingLevel}>
                          <SelectTrigger id="niveau_cuisine"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debutant">Débutant</SelectItem>
                            <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                            <SelectItem value="avance">Avancé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="freq_emporter">Fréquence de repas à emporter</Label>
                        <Select value={mealFrequency} onValueChange={setMealFrequency}>
                          <SelectTrigger id="freq_emporter"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rarement">Rarement</SelectItem>
                            <SelectItem value="quelques_fois">Quelques fois</SelectItem>
                            <SelectItem value="tous_les_jours">Tous les jours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ustensiles disponibles</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['Four', 'Mixeur', 'Air fryer', 'Micro-ondes', 'Casserole', 'Poêle', 'Robot de cuisine'].map((ust) => (
                          <div key={ust} className="flex items-center space-x-2">
                            <Checkbox id={ust} checked={availableTools.includes(ust)} onCheckedChange={() => toggleInArray(availableTools, setAvailableTools, ust)} />
                            <Label htmlFor={ust} className="text-sm">{ust}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* ═══════════ Section 4: Allergies et restrictions ═══════════ */}
            <AccordionItem value="section4">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="w-5 h-5 text-primary" />
                      Allergies et restrictions
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Allergies</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['Gluten', 'Lactose', 'Fruits à coque', 'Arachide', 'Œufs', 'Fruits de mer', 'Soja', 'Sésame', 'Moutarde', 'Sulfites / Additifs'].map((allergie) => (
                          <div key={allergie} className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox id={allergie} checked={selectedAllergies.includes(allergie)} onCheckedChange={() => toggleInArray(selectedAllergies, setSelectedAllergies, allergie)} />
                              <Label htmlFor={allergie} className="text-sm">{allergie}</Label>
                            </div>
                            {selectedAllergies.includes(allergie) && (
                              <div className="ml-6 flex gap-3">
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input type="radio" name={`type_${allergie}`} value="allergie" checked={(allergieTypes[allergie] || 'allergie') === 'allergie'}
                                    onChange={() => setAllergieTypes(prev => ({ ...prev, [allergie]: 'allergie' }))} className="accent-[hsl(var(--primary))]" />
                                  Allergie
                                </label>
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input type="radio" name={`type_${allergie}`} value="intolerance" checked={allergieTypes[allergie] === 'intolerance'}
                                    onChange={() => setAllergieTypes(prev => ({ ...prev, [allergie]: 'intolerance' }))} className="accent-[hsl(var(--primary))]" />
                                  Intolérance
                                </label>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedAllergies.length > 0 && (
                      <div className="flex items-center justify-between">
                        <Label htmlFor="traces">Traces acceptées ?</Label>
                        <Switch id="traces" checked={tracesAccepted} onCheckedChange={setTracesAccepted} />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="autres_allergies">Autres allergies</Label>
                      <Input id="autres_allergies" value={otherAllergies} onChange={(e) => setOtherAllergies(e.target.value)} placeholder="Ex : Céleri, poisson..." />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* ═══════════ Section 5: Style alimentaire ═══════════ */}
            <AccordionItem value="section5">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Leaf className="w-5 h-5 text-primary" />
                      Votre style alimentaire
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="type_alim">Type d'alimentation</Label>
                      <Select value={dietType} onValueChange={setDietType}>
                        <SelectTrigger id="type_alim"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                        <SelectContent>
                          {['Omnivore', 'Végétarien', 'Végétalien', 'Pescétarien', 'Flexitarien', 'Kéto', 'Low Carb', 'Paléo', 'Méditerranéen'].map((type) => (
                            <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Aliments à éviter</Label>
                      {foodsToAvoid.map((item, idx) => (
                        <Input key={idx} value={item} onChange={(e) => updateTextField(foodsToAvoid, setFoodsToAvoid, idx, e.target.value)} placeholder="Ex : Brocoli" />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setFoodsToAvoid(prev => [...prev, ''])}>+ Ajouter un aliment</Button>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {FOOD_SUGGESTIONS.filter(s => !foodsToAvoid.includes(s)).map((sug) => (
                          <button key={sug} type="button" onClick={() => setFoodsToAvoid(prev => [...prev, sug])}
                            className="px-2 py-1 rounded-full text-xs border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ingrédients favoris</Label>
                      {favoriteIngredients.map((item, idx) => (
                        <Input key={idx} value={item} onChange={(e) => updateTextField(favoriteIngredients, setFavoriteIngredients, idx, e.target.value)} placeholder="Ex : Avocat" />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setFavoriteIngredients(prev => [...prev, ''])}>+ Ajouter un ingrédient</Button>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {FOOD_SUGGESTIONS.filter(s => !favoriteIngredients.includes(s)).map((sug) => (
                          <button key={sug} type="button" onClick={() => setFavoriteIngredients(prev => [...prev, sug])}
                            className="px-2 py-1 rounded-full text-xs border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cuisine préférée</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['Italienne', 'Française', 'Asiatique', 'Mexicaine', 'Méditerranéenne', 'Indienne', 'Américaine', 'Africaine', 'Autre'].map((cuisine) => (
                          <div key={cuisine} className="flex items-center space-x-2">
                            <Checkbox id={cuisine} checked={favoriteCuisines.includes(cuisine)} onCheckedChange={() => toggleInArray(favoriteCuisines, setFavoriteCuisines, cuisine)} />
                            <Label htmlFor={cuisine} className="text-sm">{cuisine}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Produits bio ou locaux ?</Label>
                      <RadioGroup value={bioLocal} onValueChange={setBioLocal}>
                        <div className="flex gap-4">
                          {['bio', 'local', 'peu_importe'].map((v) => (
                            <div key={v} className="flex items-center space-x-2">
                              <RadioGroupItem value={v} id={`bio_${v}`} />
                              <Label htmlFor={`bio_${v}`}>{v === 'peu_importe' ? 'Peu importe' : v.charAt(0).toUpperCase() + v.slice(1)}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="saison">Privilégier les produits de saison</Label>
                      <Switch id="saison" checked={preferSeasonal} onCheckedChange={setPreferSeasonal} />
                    </div>

                    <div className="space-y-2">
                      <Label>Niveau d'épices</Label>
                      <RadioGroup value={spiceLevel} onValueChange={setSpiceLevel}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {['doux', 'moyen', 'epice', 'tres_epice'].map((v) => (
                            <div key={v} className="flex items-center space-x-2">
                              <RadioGroupItem value={v} id={`epice_${v}`} />
                              <Label htmlFor={`epice_${v}`}>{v === 'tres_epice' ? 'Très épicé' : v === 'epice' ? 'Épicé' : v.charAt(0).toUpperCase() + v.slice(1)}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="sucre">Limiter le sucre ajouté</Label>
                      <Switch id="sucre" checked={reduceSugar} onCheckedChange={setReduceSugar} />
                    </div>

                    <div className="space-y-2">
                      <Label>Mode de cuisson préféré</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Cru', 'Grillé', 'Mijoté', 'Vapeur'].map((mode) => (
                          <div key={mode} className="flex items-center space-x-2">
                            <Checkbox id={mode} checked={cookingMethod.includes(mode)} onCheckedChange={() => toggleInArray(cookingMethod, setCookingMethod, mode)} />
                            <Label htmlFor={mode} className="text-sm">{mode}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* ═══════════ Section 6: Besoins nutritionnels ═══════════ */}
            <AccordionItem value="section6">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Scale className="w-5 h-5 text-primary" />
                      Vos besoins nutritionnels
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Objectif calorique</Label>
                      <RadioGroup value={caloricGoal} onValueChange={setCaloricGoal}>
                        <div className="flex gap-4">
                          {['hypocalorique', 'equilibre', 'hypercalorique'].map((v) => (
                            <div key={v} className="flex items-center space-x-2">
                              <RadioGroupItem value={v} id={`cal_${v}`} />
                              <Label htmlFor={`cal_${v}`}>{v === 'equilibre' ? 'Équilibré' : v.charAt(0).toUpperCase() + v.slice(1)}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cal_precis">Objectif calorique précis (kcal/jour) — optionnel</Label>
                      <Input id="cal_precis" type="number" min="800" max="6000" step="50" value={targetKcal || ''} onChange={(e) => setTargetKcal(parseInt(e.target.value) || null)} placeholder="Ex : 2000" />
                    </div>

                    <div className="space-y-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setMacrosCustom(!macrosCustom)} className="gap-1">
                        <ChevronDown className={`h-4 w-4 transition-transform ${macrosCustom ? 'rotate-180' : ''}`} />
                        Personnaliser la répartition des macros (avancé)
                      </Button>
                      {macrosCustom && (
                        <div className="space-y-4 pt-2 pl-2 border-l-2 border-primary/20">
                          <div className="space-y-2">
                            <Label htmlFor="macros">Répartition des macros</Label>
                            <Select value={macroDistribution} onValueChange={setMacroDistribution}>
                              <SelectTrigger id="macros"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="riche_proteines">Riche en protéines</SelectItem>
                                <SelectItem value="equilibre">Équilibré</SelectItem>
                                <SelectItem value="pauvre_glucides">Pauvre en glucides</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="proteines">Apport en protéines (g/kg)</Label>
                            <Input id="proteines" type="number" step="0.1" min="0" max="5" value={proteinGPerKg || ''} onChange={(e) => setProteinGPerKg(parseFloat(e.target.value) || null)} placeholder="Ex : 1.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="fibres">Recettes riches en fibres</Label>
                      <Switch id="fibres" checked={trackFiber} onCheckedChange={setTrackFiber} />
                    </div>

                    <div className="space-y-2">
                      <Label>Produits laitiers</Label>
                      <RadioGroup value={dairyPreference} onValueChange={setDairyPreference}>
                        <div className="flex gap-4">
                          {['avec', 'sans', 'flexible'].map((v) => (
                            <div key={v} className="flex items-center space-x-2">
                              <RadioGroupItem value={v} id={`lait_${v}`} />
                              <Label htmlFor={`lait_${v}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* ═══════════ Section 7: Votre foyer ═══════════ */}
            <AccordionItem value="section7">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-primary" />
                      Votre foyer
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Les portions de vos menus et votre liste de courses seront automatiquement adaptées à la composition de votre foyer.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="hh_adults" className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Nombre d'adultes</Label>
                        <Input id="hh_adults" type="number" min={0} max={10} step={1} value={householdAdults} onChange={(e) => setHouseholdAdults(Math.max(0, parseInt(e.target.value) || 0))} className="text-center text-lg font-semibold" />
                        <p className="text-xs text-muted-foreground">1 portion = 1 adulte</p>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="hh_children" className="flex items-center gap-2"><Baby className="h-4 w-4 text-muted-foreground" />Nombre d'enfants</Label>
                        <Input id="hh_children" type="number" min={0} max={10} step={1} value={householdChildren} onChange={(e) => setHouseholdChildren(Math.max(0, parseInt(e.target.value) || 0))} className="text-center text-lg font-semibold" />
                      </div>
                    </div>

                    {householdChildren > 0 && (
                      <div className="space-y-3">
                        <Label>Âge de chaque enfant</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {childAges.map((ca, idx) => (
                            <div key={idx} className="space-y-1">
                              <Label htmlFor={`child_age_${idx}`} className="text-xs text-muted-foreground">Enfant {idx + 1}</Label>
                              <Input id={`child_age_${idx}`} type="number" min={0} max={18} value={ca} onChange={(e) => { const n = [...childAges]; n[idx] = parseInt(e.target.value) || 0; setChildAges(n); }} className="text-center" />
                              <p className="text-[10px] text-muted-foreground text-center">Coeff : {childPortionCoeff(ca)}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">0-3 ans = 0.3 · 4-8 ans = 0.5 · 9-13 ans = 0.7 · 14+ ans = 1.0</p>
                      </div>
                    )}

                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Portions équivalentes</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {householdAdults} adulte{householdAdults > 1 ? 's' : ''}
                            {householdChildren > 0 && ` + ${householdChildren} enfant${householdChildren > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{effectivePortions.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">portions</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="family_allergies">Allergies des proches</Label>
                      <Input id="family_allergies" value={familyAllergies} onChange={(e) => setFamilyAllergies(e.target.value)} placeholder="Ex : Arachides, gluten..." />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* ═══════════ Section 8: Mode de vie ═══════════ */}
            <AccordionItem value="section8">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Heart className="w-5 h-5 text-primary" />
                      Votre mode de vie
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="type_travail">Type de travail</Label>
                      <MobileSelect id="type_travail" value={workType} onValueChange={setWorkType} placeholder="Sélectionnez..." options={[
                        { value: 'bureau', label: 'Travail de bureau (sédentaire)' },
                        { value: 'debout', label: 'Travail debout' },
                        { value: 'physique', label: 'Travail physique' },
                        { value: 'sans_activite', label: 'Sans activité professionnelle' },
                        { value: 'retraite', label: 'Retraité' },
                      ]} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contraintes_horaires">Contraintes horaires</Label>
                      <MobileSelect id="contraintes_horaires" value={scheduleType} onValueChange={setScheduleType} placeholder="Sélectionnez..." options={[
                        { value: 'classique', label: 'Horaires classiques' },
                        { value: 'decale', label: 'Horaires décalés' },
                        { value: 'nuit', label: 'Travail de nuit' },
                        { value: 'variable', label: 'Horaires variables' },
                      ]} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stress">Niveau de stress</Label>
                      <Select value={stressLevel} onValueChange={setStressLevel}>
                        <SelectTrigger id="stress"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bas">Faible</SelectItem>
                          <SelectItem value="moyen">Moyen</SelectItem>
                          <SelectItem value="eleve">Élevé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sommeil">Sommeil moyen (heures)</Label>
                      <Input id="sommeil" type="number" step="0.5" min="0" max="24" value={sleepHours || ''} onChange={(e) => setSleepHours(parseFloat(e.target.value) || null)} placeholder="Ex : 7.5" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="motivation">Motivation principale</Label>
                      <Select value={mainMotivation} onValueChange={setMainMotivation}>
                        <SelectTrigger id="motivation"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sante">Santé</SelectItem>
                          <SelectItem value="energie">Énergie</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="bien_etre_mental">Bien-être mental</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget_hebdo">Budget alimentaire hebdomadaire</Label>
                      <Select value={weeklyBudget} onValueChange={setWeeklyBudget}>
                        <SelectTrigger id="budget_hebdo"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30_50">€30–50</SelectItem>
                          <SelectItem value="50_100">€50–100</SelectItem>
                          <SelectItem value="100_120">€100–120</SelectItem>
                          <SelectItem value="plus_120">€120+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lieu">Lieu des courses</Label>
                        <Select value={shoppingLocation} onValueChange={setShoppingLocation}>
                          <SelectTrigger id="lieu"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="supermarche">Supermarché</SelectItem>
                            <SelectItem value="marche">Marché</SelectItem>
                            <SelectItem value="drive">Drive</SelectItem>
                            <SelectItem value="livraison">Livraison</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="freq_courses">Fréquence des courses</Label>
                        <Select value={shoppingFrequency} onValueChange={setShoppingFrequency}>
                          <SelectTrigger id="freq_courses"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1x">1 fois par semaine</SelectItem>
                            <SelectItem value="2x">2 fois par semaine</SelectItem>
                            <SelectItem value="3x">3+ fois par semaine</SelectItem>
                            <SelectItem value="quotidien">Quotidien</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="lifestyle">Souhaitez-vous aussi des conseils sport / sommeil / hydratation ?</Label>
                      <Switch id="lifestyle" checked={sportAdvice} onCheckedChange={setSportAdvice} />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>

          <div className="mt-6 md:mt-8 pb-4">
            <Button onClick={handleSave} disabled={saving} className="w-full text-sm md:text-base" size="lg">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
            </Button>
            {saveError && (
              <p className="text-sm text-destructive mt-2 text-center">{saveError}</p>
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

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
import { toParisTime } from '@/lib/date-utils';
import { User, Target, Utensils, AlertTriangle, Leaf, Scale, Users, Heart, Save, Baby, ChevronDown } from 'lucide-react';
import { MealCardSection, type MealConfig } from '@/components/app/MealCardSection';

/** Age-based child portion coefficient */
function childPortionCoeff(age: number): number {
  if (age <= 3) return 0.3;
  if (age <= 8) return 0.5;
  if (age <= 13) return 0.7;
  return 1.0;
}

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [prefs, setPrefs] = useState({
    // Section 1: Informations personnelles
    sexe: '',
    age: null as number | null,
    taille_cm: null as number | null,
    poids_actuel_kg: null as number | null,
    poids_souhaite_kg: null as number | null,
    niveau_activite: '',
    metier: '',
    
    // Section 2: Objectifs
    objectif_principal: '',
    duree_souhaitee: '',
    
    // Section 3: Habitudes alimentaires
    repas_par_jour: null as number | null,
    portions_par_repas: null as number | null,
    temps_preparation: '',
    batch_cooking: '',
    niveau_cuisine: '',
    frequence_repas_emporter: '',
    ustensiles: [] as string[],
    
    // Section 4: Allergies & restrictions
    allergies: [] as string[],
    autres_allergies: '',
    
    // Section 5: Régime & préférences
    type_alimentation: '',
    aliments_eviter: [] as string[],
    ingredients_favoris: [] as string[],
    cuisine_preferee: [] as string[],
    produits_bio_locaux: '',
    niveau_sel: '',
    limiter_sucre: false,
    niveau_epices: '',
    mode_cuisson_prefere: [] as string[],
    
    // Section 6: Objectifs nutritionnels
    objectif_calorique: '',
    repartition_macros: '',
    apport_proteines_g_kg: null as number | null,
    recettes_riches_fibres: false,
    produits_laitiers: '',
    taille_portion: '',
    
    // Section 7: Contexte familial
    cuisine_pour_enfants: false,
    nombre_enfants: null as number | null,
    age_enfants: [] as number[],
    autres_adultes: null as number | null,
    allergies_proches: [] as string[],
    
    // Section 8: Style de vie
    niveau_stress: '',
    sommeil_heures: null as number | null,
    motivation_principale: '',
    principal_frein: '',
    budget_hebdomadaire: '',
    lieu_courses: '',
    frequence_courses: '',
    conseils_lifestyle: false,
    
    // Legacy fields
    objectifs: [] as string[],
    budget: '',
    temps: '',
    personnes: 1,
    
    // New local-only fields (stored via appliances_owned / age_enfants etc.)
    appliances_owned: [] as string[],
  });

  // ── New local-only UI state ──
  const [conditionsMedicales, setConditionsMedicales] = useState<string[]>([]);
  const [delaiPoids, setDelaiPoids] = useState('');
  const [freins, setFreins] = useState<string[]>([]);
  const [tailleAppetit, setTailleAppetit] = useState('');
  const [meals, setMeals] = useState<MealConfig[]>([]);
  const [allergieTypes, setAllergieTypes] = useState<Record<string, 'allergie' | 'intolerance'>>({});
  const [tracesAcceptees, setTracesAcceptees] = useState(false);
  const [privilegierSaison, setPrivilegierSaison] = useState(false);
  const [showMacroDetails, setShowMacroDetails] = useState(false);
  const [objectifCalPrecis, setObjectifCalPrecis] = useState<number | null>(null);
  const [typeTravail, setTypeTravail] = useState('');
  const [contraintesHoraires, setContraintesHoraires] = useState('');

  // ── Household (merged section 7) ──
  const [householdAdults, setHouseholdAdults] = useState(1);
  const [householdChildren, setHouseholdChildren] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);

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
    const childPortions = childAges.reduce((s, age) => s + childPortionCoeff(age), 0);
    return adultPortions + childPortions;
  }, [householdAdults, childAges]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setPrefs({
          sexe: data.sexe || '',
          age: data.age,
          taille_cm: data.taille_cm,
          poids_actuel_kg: data.poids_actuel_kg,
          poids_souhaite_kg: data.poids_souhaite_kg,
          niveau_activite: data.niveau_activite || '',
          metier: data.metier || '',
          objectif_principal: data.objectif_principal || '',
          duree_souhaitee: data.duree_souhaitee || '',
          repas_par_jour: data.repas_par_jour,
          portions_par_repas: data.portions_par_repas,
          temps_preparation: data.temps_preparation || '',
          batch_cooking: data.batch_cooking || '',
          niveau_cuisine: data.niveau_cuisine || '',
          frequence_repas_emporter: data.frequence_repas_emporter || '',
          ustensiles: data.ustensiles || [],
          allergies: data.allergies || [],
          autres_allergies: data.autres_allergies || '',
          type_alimentation: data.type_alimentation || '',
          aliments_eviter: data.aliments_eviter || [],
          ingredients_favoris: data.ingredients_favoris || [],
          cuisine_preferee: data.cuisine_preferee || [],
          produits_bio_locaux: data.produits_bio_locaux || '',
          niveau_sel: data.niveau_sel || '',
          limiter_sucre: data.limiter_sucre || false,
          niveau_epices: data.niveau_epices || '',
          mode_cuisson_prefere: data.mode_cuisson_prefere || [],
          objectif_calorique: data.objectif_calorique || '',
          repartition_macros: data.repartition_macros || '',
          apport_proteines_g_kg: data.apport_proteines_g_kg,
          recettes_riches_fibres: data.recettes_riches_fibres || false,
          produits_laitiers: data.produits_laitiers || '',
          taille_portion: data.taille_portion || '',
          cuisine_pour_enfants: data.cuisine_pour_enfants || false,
          nombre_enfants: data.nombre_enfants,
          age_enfants: data.age_enfants || [],
          autres_adultes: data.autres_adultes,
          allergies_proches: data.allergies_proches || [],
          niveau_stress: data.niveau_stress || '',
          sommeil_heures: data.sommeil_heures,
          motivation_principale: data.motivation_principale || '',
          principal_frein: data.principal_frein || '',
          budget_hebdomadaire: data.budget_hebdomadaire || '',
          lieu_courses: data.lieu_courses || '',
          frequence_courses: data.frequence_courses || '',
          conseils_lifestyle: data.conseils_lifestyle || false,
          objectifs: data.objectifs || [],
          budget: data.budget || '',
          temps: data.temps || '',
          personnes: data.personnes || 1,
          appliances_owned: data.appliances_owned || [],
        });

        // Load household from profiles
        if (data.autres_adultes !== null) {
          setHouseholdAdults((data.autres_adultes || 0) + 1);
        }
        if (data.age_enfants && data.age_enfants.length > 0) {
          setChildAges(data.age_enfants);
          setHouseholdChildren(data.age_enfants.length);
        } else if (data.nombre_enfants) {
          setHouseholdChildren(data.nombre_enfants);
        }

        // Restore taille_portion as appetite
        if (data.taille_portion) setTailleAppetit(data.taille_portion);
      }

      // Also load household from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('household_adults, household_children')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.household_adults !== null) setHouseholdAdults(profile.household_adults);
        if (profile.household_children !== null) setHouseholdChildren(profile.household_children);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour sauvegarder vos préférences.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { data: currentPrefs, error: fetchError } = await supabase
        .from('preferences')
        .select('updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (currentPrefs?.updated_at) {
        const lastUpdate = toParisTime(currentPrefs.updated_at);
        const minutesSinceUpdate = (Date.now() - lastUpdate.getTime()) / 60000;

        if (minutesSinceUpdate < 5) {
          toast({
            title: 'Trop rapide',
            description: `Vous pouvez modifier vos préférences dans ${Math.ceil(5 - minutesSinceUpdate)} minute${Math.ceil(5 - minutesSinceUpdate) > 1 ? 's' : ''}.`,
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
      }

      // Map appetite back to taille_portion
      const prefsToSave = {
        ...prefs,
        taille_portion: tailleAppetit || prefs.taille_portion,
        age_enfants: childAges,
        nombre_enfants: householdChildren,
        autres_adultes: Math.max(0, householdAdults - 1),
      };

      const { error: upsertError } = await supabase
        .from('preferences')
        .upsert(
          {
            user_id: user.id,
            ...prefsToSave,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      // Save household to profiles
      await supabase
        .from('profiles')
        .update({
          household_adults: householdAdults,
          household_children: householdChildren,
        })
        .eq('id', user.id);

      toast({
        title: '✅ Vos préférences ont bien été enregistrées !',
        description: 'Votre menu se régénère avec vos nouvelles préférences...',
      });

      // Trigger menu regeneration
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const { error: menuErr } = await supabase.functions.invoke('generate-menu', {
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
          });
          
          if (menuErr) {
            console.error('Edge Function error (generate-menu):', menuErr);
          } else {
            toast({
              title: '🎉 Menu mis à jour !',
              description: 'Votre menu hebdomadaire a été régénéré.',
            });
          }
        }
      } catch (menuError) {
        console.error('Error regenerating menu:', menuError);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos préférences. Réessayez plus tard.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (key: keyof typeof prefs, value: string) => {
    setPrefs(prev => {
      const array = prev[key] as string[];
      return {
        ...prev,
        [key]: array.includes(value) 
          ? array.filter(item => item !== value)
          : [...array, value],
      };
    });
  };

  const updateTextField = (key: keyof typeof prefs, index: number, value: string) => {
    setPrefs(prev => {
      const array = [...(prev[key] as string[])];
      if (value) {
        array[index] = value;
      } else {
        array.splice(index, 1);
      }
      return { ...prev, [key]: array.filter(Boolean) };
    });
  };

  const addTextField = (key: keyof typeof prefs) => {
    setPrefs(prev => ({
      ...prev,
      [key]: [...(prev[key] as string[]), ''],
    }));
  };

  // Toggle helper for local arrays
  const toggleLocalArray = (
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  // Suggestion pills for food items
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
              Aidez-nous à personnaliser vos recommandations au maximum
            </p>
          </div>

          <Accordion type="multiple" defaultValue={["section1", "section2"]} className="space-y-4">

            {/* ═══════════ Section 1: Ton profil ═══════════ */}
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
                      <RadioGroup value={prefs.sexe} onValueChange={(v) => setPrefs({...prefs, sexe: v})}>
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="homme" id="homme" />
                            <Label htmlFor="homme">Homme</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="femme" id="femme" />
                            <Label htmlFor="femme">Femme</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="autre" id="autre" />
                            <Label htmlFor="autre">Autre</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Âge</Label>
                        <Input
                          id="age"
                          type="number"
                          min="1"
                          max="120"
                          value={prefs.age || ''}
                          onChange={(e) => setPrefs({...prefs, age: parseInt(e.target.value) || null})}
                          placeholder="Ex : 30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taille">Taille (cm)</Label>
                        <Input
                          id="taille"
                          type="number"
                          min="50"
                          max="250"
                          value={prefs.taille_cm || ''}
                          onChange={(e) => setPrefs({...prefs, taille_cm: parseInt(e.target.value) || null})}
                          placeholder="Ex : 170"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="poids_actuel">Poids actuel (kg)</Label>
                        <Input
                          id="poids_actuel"
                          type="number"
                          step="0.1"
                          value={prefs.poids_actuel_kg || ''}
                          onChange={(e) => setPrefs({...prefs, poids_actuel_kg: parseFloat(e.target.value) || null})}
                          placeholder="Ex : 70"
                        />
                      </div>
                    </div>

                    {/* Poids souhaité + En combien de temps (côte à côte) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="poids_souhaite">Poids souhaité (kg)</Label>
                        <Input
                          id="poids_souhaite"
                          type="number"
                          step="0.1"
                          value={prefs.poids_souhaite_kg || ''}
                          onChange={(e) => setPrefs({...prefs, poids_souhaite_kg: parseFloat(e.target.value) || null})}
                          placeholder="Ex : 65"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delai_poids">En combien de temps ?</Label>
                        <MobileSelect
                          id="delai_poids"
                          value={delaiPoids}
                          onValueChange={setDelaiPoids}
                          placeholder="Sélectionnez..."
                          options={[
                            { value: '1_mois', label: '1 mois' },
                            { value: '3_mois', label: '3 mois' },
                            { value: '6_mois', label: '6 mois' },
                            { value: 'sans_delai', label: 'Sans délai précis' },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="niveau_activite">Niveau d'activité</Label>
                        <MobileSelect
                          id="niveau_activite"
                          value={prefs.niveau_activite}
                          onValueChange={(v) => setPrefs({...prefs, niveau_activite: v})}
                          placeholder="Sélectionnez..."
                          options={[
                            { value: 'sedentaire', label: 'Sédentaire' },
                            { value: 'leger', label: 'Léger' },
                            { value: 'modere', label: 'Modéré' },
                            { value: 'actif', label: 'Actif' },
                            { value: 'sportif', label: 'Sportif' },
                          ]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="metier">Métier</Label>
                        <MobileSelect
                          id="metier"
                          value={prefs.metier}
                          onValueChange={(v) => setPrefs({...prefs, metier: v})}
                          placeholder="Sélectionnez..."
                          options={[
                            { value: 'assis', label: 'Assis' },
                            { value: 'debout', label: 'Debout' },
                            { value: 'physique', label: 'Physique' },
                            { value: 'autre', label: 'Autre' },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Conditions médicales (multi-select pills) */}
                    <div className="space-y-2">
                      <Label>Conditions médicales</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          'Aucune', 'Diabète type 2', 'Hypertension', 'Cholestérol élevé',
                          'Hypothyroïdie', 'Autre',
                        ].map((cond) => (
                          <div key={cond} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cond_${cond}`}
                              checked={conditionsMedicales.includes(cond)}
                              onCheckedChange={() => {
                                if (cond === 'Aucune') {
                                  setConditionsMedicales(conditionsMedicales.includes('Aucune') ? [] : ['Aucune']);
                                } else {
                                  toggleLocalArray(
                                    conditionsMedicales.filter((c) => c !== 'Aucune'),
                                    (v) => setConditionsMedicales(typeof v === 'function' ? v(conditionsMedicales.filter(c => c !== 'Aucune')) : v),
                                    cond
                                  );
                                }
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

            {/* ═══════════ Section 2: Tes objectifs ═══════════ */}
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
                      <RadioGroup value={prefs.objectif_principal} onValueChange={(v) => setPrefs({...prefs, objectif_principal: v})}>
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
                      <Select value={prefs.duree_souhaitee} onValueChange={(v) => setPrefs({...prefs, duree_souhaitee: v})}>
                        <SelectTrigger id="duree">
                          <SelectValue placeholder="Sélectionnez..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="court">Court terme (1-4 semaines)</SelectItem>
                          <SelectItem value="moyen">Moyen terme (1-3 mois)</SelectItem>
                          <SelectItem value="long">Long terme (3+ mois)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Vos principaux freins (multi-select pills) */}
                    <div className="space-y-2">
                      <Label>Vos principaux freins</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Manque de temps', 'Manque d\'idées', 'Budget limité',
                          'Manque de motivation', 'Difficultés à cuisiner', 'Famille difficile à satisfaire',
                        ].map((frein) => (
                          <button
                            key={frein}
                            type="button"
                            onClick={() => toggleLocalArray(freins, setFreins, frein)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              freins.includes(frein)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-border hover:bg-accent'
                            }`}
                          >
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
                        <Select value={prefs.repas_par_jour?.toString() || ''} onValueChange={(v) => setPrefs({...prefs, repas_par_jour: parseInt(v)})}>
                          <SelectTrigger id="repas_jour">
                            <SelectValue placeholder="Sélectionnez..." />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2].map(n => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="appetit">Taille d'appétit</Label>
                        <MobileSelect
                          id="appetit"
                          value={tailleAppetit}
                          onValueChange={setTailleAppetit}
                          placeholder="Sélectionnez..."
                          options={[
                            { value: 'petit', label: 'Petit appétit' },
                            { value: 'normal', label: 'Appétit normal' },
                            { value: 'grand', label: 'Grand appétit' },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Dynamic meal cards */}
                    <MealCardSection
                      repasParJour={prefs.repas_par_jour}
                      meals={meals}
                      onMealsChange={setMeals}
                      adults={householdAdults}
                      childrenAges={childAges}
                    />

                    <div className="space-y-2">
                      <Label>Temps de préparation souhaité</Label>
                      <RadioGroup value={prefs.temps_preparation} onValueChange={(v) => setPrefs({...prefs, temps_preparation: v})}>
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
                      <RadioGroup value={prefs.batch_cooking} onValueChange={(v) => setPrefs({...prefs, batch_cooking: v})}>
                        <div className="flex gap-4">
                          {['oui', 'non', 'flexible'].map((v) => (
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
                        <Select value={prefs.niveau_cuisine} onValueChange={(v) => setPrefs({...prefs, niveau_cuisine: v})}>
                          <SelectTrigger id="niveau_cuisine">
                            <SelectValue placeholder="Sélectionnez..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debutant">Débutant</SelectItem>
                            <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="freq_emporter">Fréquence de repas à emporter</Label>
                        <Select value={prefs.frequence_repas_emporter} onValueChange={(v) => setPrefs({...prefs, frequence_repas_emporter: v})}>
                          <SelectTrigger id="freq_emporter">
                            <SelectValue placeholder="Sélectionnez..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="jamais">Jamais</SelectItem>
                            <SelectItem value="parfois">Parfois</SelectItem>
                            <SelectItem value="souvent">Souvent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ustensiles disponibles</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['Four', 'Mixeur', 'Air fryer', 'Micro-ondes', 'Casserole', 'Poêle', 'Robot de cuisine'].map((ust) => (
                          <div key={ust} className="flex items-center space-x-2">
                            <Checkbox
                              id={ust}
                              checked={prefs.ustensiles.includes(ust)}
                              onCheckedChange={() => toggleArrayItem('ustensiles', ust)}
                            />
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
                        {[
                          'Gluten', 'Lactose', 'Fruits à coque', 'Arachide', 
                          'Œufs', 'Fruits de mer', 'Soja', 'Sésame', 
                          'Moutarde', 'Sulfites / Additifs'
                        ].map((allergie) => (
                          <div key={allergie} className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={allergie}
                                checked={prefs.allergies.includes(allergie)}
                                onCheckedChange={() => toggleArrayItem('allergies', allergie)}
                              />
                              <Label htmlFor={allergie} className="text-sm">{allergie}</Label>
                            </div>
                            {/* Allergie vs Intolérance radio */}
                            {prefs.allergies.includes(allergie) && (
                              <div className="ml-6 flex gap-3">
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`type_${allergie}`}
                                    value="allergie"
                                    checked={(allergieTypes[allergie] || 'allergie') === 'allergie'}
                                    onChange={() => setAllergieTypes((prev) => ({ ...prev, [allergie]: 'allergie' }))}
                                    className="accent-[hsl(var(--primary))]"
                                  />
                                  Allergie
                                </label>
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`type_${allergie}`}
                                    value="intolerance"
                                    checked={allergieTypes[allergie] === 'intolerance'}
                                    onChange={() => setAllergieTypes((prev) => ({ ...prev, [allergie]: 'intolerance' }))}
                                    className="accent-[hsl(var(--primary))]"
                                  />
                                  Intolérance
                                </label>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Traces acceptées toggle */}
                    {prefs.allergies.length > 0 && (
                      <div className="flex items-center justify-between">
                        <Label htmlFor="traces">Traces acceptées ?</Label>
                        <Switch
                          id="traces"
                          checked={tracesAcceptees}
                          onCheckedChange={setTracesAcceptees}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="autres_allergies">Autres allergies</Label>
                      <Input
                        id="autres_allergies"
                        value={prefs.autres_allergies}
                        onChange={(e) => setPrefs({...prefs, autres_allergies: e.target.value})}
                        placeholder="Ex : Céleri, poisson..."
                      />
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
                      <Select value={prefs.type_alimentation} onValueChange={(v) => setPrefs({...prefs, type_alimentation: v})}>
                        <SelectTrigger id="type_alim">
                          <SelectValue placeholder="Sélectionnez..." />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            'Omnivore', 'Végétarien', 'Végétalien', 'Pescétarien',
                            'Flexitarien', 'Kéto', 'Low Carb', 'Paléo', 'Méditerranéen'
                          ].map((type) => (
                            <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Aliments à éviter + suggestions */}
                    <div className="space-y-2">
                      <Label>Aliments à éviter</Label>
                      {prefs.aliments_eviter.map((item, idx) => (
                        <Input
                          key={idx}
                          value={item}
                          onChange={(e) => updateTextField('aliments_eviter', idx, e.target.value)}
                          placeholder="Ex : Brocoli"
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addTextField('aliments_eviter')}>
                        + Ajouter un aliment
                      </Button>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {FOOD_SUGGESTIONS.filter((s) => !prefs.aliments_eviter.includes(s)).map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setPrefs((p) => ({ ...p, aliments_eviter: [...p.aliments_eviter, sug] }))}
                            className="px-2 py-1 rounded-full text-xs border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ingrédients favoris + suggestions */}
                    <div className="space-y-2">
                      <Label>Ingrédients favoris</Label>
                      {prefs.ingredients_favoris.map((item, idx) => (
                        <Input
                          key={idx}
                          value={item}
                          onChange={(e) => updateTextField('ingredients_favoris', idx, e.target.value)}
                          placeholder="Ex : Avocat"
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addTextField('ingredients_favoris')}>
                        + Ajouter un ingrédient
                      </Button>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {FOOD_SUGGESTIONS.filter((s) => !prefs.ingredients_favoris.includes(s)).map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setPrefs((p) => ({ ...p, ingredients_favoris: [...p.ingredients_favoris, sug] }))}
                            className="px-2 py-1 rounded-full text-xs border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cuisine préférée</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          'Italienne', 'Française', 'Asiatique', 'Mexicaine',
                          'Méditerranéenne', 'Indienne', 'Américaine', 'Africaine', 'Autre'
                        ].map((cuisine) => (
                          <div key={cuisine} className="flex items-center space-x-2">
                            <Checkbox
                              id={cuisine}
                              checked={prefs.cuisine_preferee.includes(cuisine)}
                              onCheckedChange={() => toggleArrayItem('cuisine_preferee', cuisine)}
                            />
                            <Label htmlFor={cuisine} className="text-sm">{cuisine}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Produits bio ou locaux ?</Label>
                      <RadioGroup value={prefs.produits_bio_locaux} onValueChange={(v) => setPrefs({...prefs, produits_bio_locaux: v})}>
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

                    {/* Privilégier les produits de saison */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="saison">Privilégier les produits de saison</Label>
                      <Switch
                        id="saison"
                        checked={privilegierSaison}
                        onCheckedChange={setPrivilegierSaison}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Niveau de sel</Label>
                      <RadioGroup value={prefs.niveau_sel} onValueChange={(v) => setPrefs({...prefs, niveau_sel: v})}>
                        <div className="flex gap-4">
                          {['normal', 'peu_sale', 'sans_sel'].map((v) => (
                            <div key={v} className="flex items-center space-x-2">
                              <RadioGroupItem value={v} id={`sel_${v}`} />
                              <Label htmlFor={`sel_${v}`}>{v === 'peu_sale' ? 'Peu salé' : v === 'sans_sel' ? 'Sans sel' : 'Normal'}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="sucre">Limiter le sucre ajouté</Label>
                      <Switch
                        id="sucre"
                        checked={prefs.limiter_sucre}
                        onCheckedChange={(v) => setPrefs({...prefs, limiter_sucre: v})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Niveau d'épices</Label>
                      <RadioGroup value={prefs.niveau_epices} onValueChange={(v) => setPrefs({...prefs, niveau_epices: v})}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {['doux', 'moyen', 'epice', 'tres_epice'].map((v) => (
                            <div key={v} className="flex items-center space-x-2">
                              <RadioGroupItem value={v} id={`epice_${v}`} />
                              <Label htmlFor={`epice_${v}`}>
                                {v === 'tres_epice' ? 'Très épicé' : v === 'epice' ? 'Épicé' : v.charAt(0).toUpperCase() + v.slice(1)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label>Mode de cuisson préféré</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Cru', 'Grillé', 'Mijoté', 'Vapeur'].map((mode) => (
                          <div key={mode} className="flex items-center space-x-2">
                            <Checkbox
                              id={mode}
                              checked={prefs.mode_cuisson_prefere.includes(mode)}
                              onCheckedChange={() => toggleArrayItem('mode_cuisson_prefere', mode)}
                            />
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
                      <RadioGroup value={prefs.objectif_calorique} onValueChange={(v) => setPrefs({...prefs, objectif_calorique: v})}>
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

                    {/* Objectif calorique précis */}
                    <div className="space-y-2">
                      <Label htmlFor="cal_precis">Objectif calorique précis (kcal/jour) — optionnel</Label>
                      <Input
                        id="cal_precis"
                        type="number"
                        min="800"
                        max="6000"
                        step="50"
                        value={objectifCalPrecis || ''}
                        onChange={(e) => setObjectifCalPrecis(parseInt(e.target.value) || null)}
                        placeholder="Ex : 2000"
                      />
                    </div>

                    {/* Macros hidden behind button */}
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMacroDetails(!showMacroDetails)}
                        className="gap-1"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${showMacroDetails ? 'rotate-180' : ''}`} />
                        Personnaliser la répartition des macros (avancé)
                      </Button>

                      {showMacroDetails && (
                        <div className="space-y-4 pt-2 pl-2 border-l-2 border-primary/20">
                          <div className="space-y-2">
                            <Label htmlFor="macros">Répartition des macros</Label>
                            <Select value={prefs.repartition_macros} onValueChange={(v) => setPrefs({...prefs, repartition_macros: v})}>
                              <SelectTrigger id="macros">
                                <SelectValue placeholder="Sélectionnez..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="riche_proteines">Riche en protéines</SelectItem>
                                <SelectItem value="equilibre">Équilibré</SelectItem>
                                <SelectItem value="pauvre_glucides">Pauvre en glucides</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="proteines">Apport en protéines (g/kg)</Label>
                            <Input
                              id="proteines"
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={prefs.apport_proteines_g_kg || ''}
                              onChange={(e) => setPrefs({...prefs, apport_proteines_g_kg: parseFloat(e.target.value) || null})}
                              placeholder="Ex : 1.5"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="fibres">Recettes riches en fibres</Label>
                      <Switch
                        id="fibres"
                        checked={prefs.recettes_riches_fibres}
                        onCheckedChange={(v) => setPrefs({...prefs, recettes_riches_fibres: v})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Produits laitiers</Label>
                      <RadioGroup value={prefs.produits_laitiers} onValueChange={(v) => setPrefs({...prefs, produits_laitiers: v})}>
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

            {/* ═══════════ Section 7: Votre foyer (merged family + household) ═══════════ */}
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
                      {/* Adults */}
                      <div className="space-y-3">
                        <Label htmlFor="hh_adults" className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Nombre d'adultes
                        </Label>
                        <Input
                          id="hh_adults"
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={householdAdults}
                          onChange={(e) => setHouseholdAdults(Math.max(0, parseInt(e.target.value) || 0))}
                          className="text-center text-lg font-semibold"
                        />
                        <p className="text-xs text-muted-foreground">1 portion = 1 adulte</p>
                      </div>

                      {/* Children */}
                      <div className="space-y-3">
                        <Label htmlFor="hh_children" className="flex items-center gap-2">
                          <Baby className="h-4 w-4 text-muted-foreground" />
                          Nombre d'enfants
                        </Label>
                        <Input
                          id="hh_children"
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={householdChildren}
                          onChange={(e) => setHouseholdChildren(Math.max(0, parseInt(e.target.value) || 0))}
                          className="text-center text-lg font-semibold"
                        />
                      </div>
                    </div>

                    {/* Dynamic child age inputs */}
                    {householdChildren > 0 && (
                      <div className="space-y-3">
                        <Label>Âge de chaque enfant</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {childAges.map((age, idx) => (
                            <div key={idx} className="space-y-1">
                              <Label htmlFor={`child_age_${idx}`} className="text-xs text-muted-foreground">
                                Enfant {idx + 1}
                              </Label>
                              <Input
                                id={`child_age_${idx}`}
                                type="number"
                                min={0}
                                max={18}
                                value={age}
                                onChange={(e) => {
                                  const newAges = [...childAges];
                                  newAges[idx] = parseInt(e.target.value) || 0;
                                  setChildAges(newAges);
                                }}
                                className="text-center"
                              />
                              <p className="text-[10px] text-muted-foreground text-center">
                                Coeff : {childPortionCoeff(age)}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          0-3 ans = 0.3 · 4-8 ans = 0.5 · 9-13 ans = 0.7 · 14+ ans = 1.0
                        </p>
                      </div>
                    )}

                    {/* Portions summary */}
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
                          <p className="text-2xl font-bold text-primary">
                            {effectivePortions.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">portions</p>
                        </div>
                      </div>
                    </div>

                    {/* Family allergies */}
                    <div className="space-y-2">
                      <Label>Allergies des proches</Label>
                      {prefs.allergies_proches.map((item, idx) => (
                        <Input
                          key={idx}
                          value={item}
                          onChange={(e) => updateTextField('allergies_proches', idx, e.target.value)}
                          placeholder="Ex : Arachides"
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addTextField('allergies_proches')}>
                        + Ajouter une allergie
                      </Button>
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
                    {/* Type de travail */}
                    <div className="space-y-2">
                      <Label htmlFor="type_travail">Type de travail</Label>
                      <MobileSelect
                        id="type_travail"
                        value={typeTravail}
                        onValueChange={setTypeTravail}
                        placeholder="Sélectionnez..."
                        options={[
                          { value: 'bureau', label: 'Travail de bureau (sédentaire)' },
                          { value: 'debout', label: 'Travail debout' },
                          { value: 'physique', label: 'Travail physique' },
                          { value: 'sans_activite', label: 'Sans activité professionnelle' },
                          { value: 'retraite', label: 'Retraité' },
                        ]}
                      />
                    </div>

                    {/* Contraintes horaires */}
                    <div className="space-y-2">
                      <Label htmlFor="contraintes_horaires">Contraintes horaires</Label>
                      <MobileSelect
                        id="contraintes_horaires"
                        value={contraintesHoraires}
                        onValueChange={setContraintesHoraires}
                        placeholder="Sélectionnez..."
                        options={[
                          { value: 'classiques', label: 'Horaires classiques' },
                          { value: 'decales', label: 'Horaires décalés' },
                          { value: 'nuit', label: 'Travail de nuit' },
                          { value: 'variables', label: 'Horaires variables' },
                        ]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stress">Niveau de stress</Label>
                      <Select value={prefs.niveau_stress} onValueChange={(v) => setPrefs({...prefs, niveau_stress: v})}>
                        <SelectTrigger id="stress">
                          <SelectValue placeholder="Sélectionnez..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="faible">Faible</SelectItem>
                          <SelectItem value="moyen">Moyen</SelectItem>
                          <SelectItem value="eleve">Élevé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sommeil">Sommeil moyen (heures)</Label>
                      <Input
                        id="sommeil"
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={prefs.sommeil_heures || ''}
                        onChange={(e) => setPrefs({...prefs, sommeil_heures: parseFloat(e.target.value) || null})}
                        placeholder="Ex : 7.5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="motivation">Motivation principale</Label>
                      <Select value={prefs.motivation_principale} onValueChange={(v) => setPrefs({...prefs, motivation_principale: v})}>
                        <SelectTrigger id="motivation">
                          <SelectValue placeholder="Sélectionnez..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sante">Santé</SelectItem>
                          <SelectItem value="apparence">Apparence</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="energie">Énergie</SelectItem>
                          <SelectItem value="bien_etre">Bien-être mental</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget_hebdo">Budget alimentaire hebdomadaire</Label>
                      <Select value={prefs.budget_hebdomadaire} onValueChange={(v) => setPrefs({...prefs, budget_hebdomadaire: v})}>
                        <SelectTrigger id="budget_hebdo">
                          <SelectValue placeholder="Sélectionnez..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30_50">€30–50</SelectItem>
                          <SelectItem value="50_100">€50–100</SelectItem>
                          <SelectItem value="plus_100">€100+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lieu">Lieu des courses</Label>
                        <Select value={prefs.lieu_courses} onValueChange={(v) => setPrefs({...prefs, lieu_courses: v})}>
                          <SelectTrigger id="lieu">
                            <SelectValue placeholder="Sélectionnez..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="supermarche">Supermarché</SelectItem>
                            <SelectItem value="marche">Marché</SelectItem>
                            <SelectItem value="bio">Magasin bio</SelectItem>
                            <SelectItem value="drive">Drive</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="freq_courses">Fréquence des courses</Label>
                        <Select value={prefs.frequence_courses} onValueChange={(v) => setPrefs({...prefs, frequence_courses: v})}>
                          <SelectTrigger id="freq_courses">
                            <SelectValue placeholder="Sélectionnez..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 fois par semaine</SelectItem>
                            <SelectItem value="2">2 fois par semaine</SelectItem>
                            <SelectItem value="3plus">3+ fois par semaine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="lifestyle">Souhaitez-vous aussi des conseils sport / sommeil / hydratation ?</Label>
                      <Switch
                        id="lifestyle"
                        checked={prefs.conseils_lifestyle}
                        onCheckedChange={(v) => setPrefs({...prefs, conseils_lifestyle: v})}
                      />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>

          <div className="mt-6 md:mt-8 pb-4">
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="w-full text-sm md:text-base" 
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
            </Button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

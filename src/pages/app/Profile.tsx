import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toParisTime } from '@/lib/date-utils';
import { User, Target, Utensils, AlertTriangle, Leaf, Scale, Users, Heart, Save } from 'lucide-react';

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
  });

  useEffect(() => {
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
        });
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
        description: 'Tu dois être connecté pour sauvegarder tes préférences.',
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
            description: `Tu peux modifier tes préférences dans ${Math.ceil(5 - minutesSinceUpdate)} minute${Math.ceil(5 - minutesSinceUpdate) > 1 ? 's' : ''}.`,
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
      }

      const { error: upsertError } = await supabase
        .from('preferences')
        .upsert(
          {
            user_id: user.id,
            ...prefs,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      toast({
        title: '✅ Tes préférences ont bien été enregistrées !',
        description: 'Tes recommandations seront personnalisées.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder tes préférences. Réessaye plus tard.',
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-muted-foreground">Chargement de tes préférences...</p>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Tes préférences</h1>
            <p className="text-muted-foreground">
              Aide-nous à personnaliser tes recommandations au maximum
            </p>
          </div>

          <Accordion type="multiple" defaultValue={["section1", "section2"]} className="space-y-4">
            {/* Section 1: Informations personnelles */}
            <AccordionItem value="section1">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-5 h-5 text-primary" />
                      Ton profil
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
                          placeholder="Ex: 30"
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
                          placeholder="Ex: 170"
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
                          placeholder="Ex: 70"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="poids_souhaite">Poids souhaité (kg)</Label>
                        <Input
                          id="poids_souhaite"
                          type="number"
                          step="0.1"
                          value={prefs.poids_souhaite_kg || ''}
                          onChange={(e) => setPrefs({...prefs, poids_souhaite_kg: parseFloat(e.target.value) || null})}
                          placeholder="Ex: 65"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="niveau_activite">Niveau d'activité</Label>
                        <Select value={prefs.niveau_activite} onValueChange={(v) => setPrefs({...prefs, niveau_activite: v})}>
                          <SelectTrigger id="niveau_activite">
                            <SelectValue placeholder="Sélectionne..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sedentaire">Sédentaire</SelectItem>
                            <SelectItem value="leger">Léger</SelectItem>
                            <SelectItem value="modere">Modéré</SelectItem>
                            <SelectItem value="actif">Actif</SelectItem>
                            <SelectItem value="sportif">Sportif</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="metier">Métier</Label>
                        <Select value={prefs.metier} onValueChange={(v) => setPrefs({...prefs, metier: v})}>
                          <SelectTrigger id="metier">
                            <SelectValue placeholder="Sélectionne..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assis">Assis</SelectItem>
                            <SelectItem value="debout">Debout</SelectItem>
                            <SelectItem value="physique">Physique</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Section 2: Objectifs */}
            <AccordionItem value="section2">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="w-5 h-5 text-primary" />
                      Tes objectifs
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
                          <SelectValue placeholder="Sélectionne..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="court">Court terme (1-4 semaines)</SelectItem>
                          <SelectItem value="moyen">Moyen terme (1-3 mois)</SelectItem>
                          <SelectItem value="long">Long terme (3+ mois)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Section 3: Habitudes alimentaires */}
            <AccordionItem value="section3">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Utensils className="w-5 h-5 text-primary" />
                      Tes habitudes alimentaires
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
                            <SelectValue placeholder="Sélectionne..." />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5].map(n => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="portions">Nombre de portions par repas</Label>
                        <Select value={prefs.portions_par_repas?.toString() || ''} onValueChange={(v) => setPrefs({...prefs, portions_par_repas: parseInt(v)})}>
                          <SelectTrigger id="portions">
                            <SelectValue placeholder="Sélectionne..." />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 4, 6].map(n => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

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
                      <Label>Préfères-tu le batch cooking ?</Label>
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
                            <SelectValue placeholder="Sélectionne..." />
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
                            <SelectValue placeholder="Sélectionne..." />
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

            {/* Section 4: Allergies & restrictions */}
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
                          <div key={allergie} className="flex items-center space-x-2">
                            <Checkbox
                              id={allergie}
                              checked={prefs.allergies.includes(allergie)}
                              onCheckedChange={() => toggleArrayItem('allergies', allergie)}
                            />
                            <Label htmlFor={allergie} className="text-sm">{allergie}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="autres_allergies">Autres allergies</Label>
                      <Input
                        id="autres_allergies"
                        value={prefs.autres_allergies}
                        onChange={(e) => setPrefs({...prefs, autres_allergies: e.target.value})}
                        placeholder="Ex: Céleri, poisson..."
                      />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Section 5: Régime & préférences */}
            <AccordionItem value="section5">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Leaf className="w-5 h-5 text-primary" />
                      Ton style alimentaire
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="type_alim">Type d'alimentation</Label>
                      <Select value={prefs.type_alimentation} onValueChange={(v) => setPrefs({...prefs, type_alimentation: v})}>
                        <SelectTrigger id="type_alim">
                          <SelectValue placeholder="Sélectionne..." />
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

                    <div className="space-y-2">
                      <Label>Aliments à éviter</Label>
                      {prefs.aliments_eviter.map((item, idx) => (
                        <Input
                          key={idx}
                          value={item}
                          onChange={(e) => updateTextField('aliments_eviter', idx, e.target.value)}
                          placeholder="Ex: Brocoli"
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addTextField('aliments_eviter')}>
                        + Ajouter un aliment
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Ingrédients favoris</Label>
                      {prefs.ingredients_favoris.map((item, idx) => (
                        <Input
                          key={idx}
                          value={item}
                          onChange={(e) => updateTextField('ingredients_favoris', idx, e.target.value)}
                          placeholder="Ex: Avocat"
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addTextField('ingredients_favoris')}>
                        + Ajouter un ingrédient
                      </Button>
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

            {/* Section 6: Objectifs nutritionnels */}
            <AccordionItem value="section6">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Scale className="w-5 h-5 text-primary" />
                      Tes besoins nutritionnels
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

                    <div className="space-y-2">
                      <Label htmlFor="macros">Répartition des macros</Label>
                      <Select value={prefs.repartition_macros} onValueChange={(v) => setPrefs({...prefs, repartition_macros: v})}>
                        <SelectTrigger id="macros">
                          <SelectValue placeholder="Sélectionne..." />
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
                        placeholder="Ex: 1.5"
                      />
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

                    <div className="space-y-2">
                      <Label htmlFor="portion">Taille de portion</Label>
                      <Select value={prefs.taille_portion} onValueChange={(v) => setPrefs({...prefs, taille_portion: v})}>
                        <SelectTrigger id="portion">
                          <SelectValue placeholder="Sélectionne..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="legere">Légère</SelectItem>
                          <SelectItem value="normale">Normale</SelectItem>
                          <SelectItem value="genereuse">Généreuse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Section 7: Contexte familial */}
            <AccordionItem value="section7">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-primary" />
                      Ta famille
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enfants">Cuisines-tu pour des enfants ?</Label>
                      <Switch
                        id="enfants"
                        checked={prefs.cuisine_pour_enfants}
                        onCheckedChange={(v) => setPrefs({...prefs, cuisine_pour_enfants: v})}
                      />
                    </div>

                    {prefs.cuisine_pour_enfants && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="nb_enfants">Combien d'enfants ?</Label>
                          <Input
                            id="nb_enfants"
                            type="number"
                            min="1"
                            max="10"
                            value={prefs.nombre_enfants || ''}
                            onChange={(e) => setPrefs({...prefs, nombre_enfants: parseInt(e.target.value) || null})}
                            placeholder="Ex: 2"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Âge des enfants</Label>
                          {prefs.age_enfants.map((age, idx) => (
                            <Input
                              key={idx}
                              type="number"
                              min="0"
                              max="18"
                              value={age}
                              onChange={(e) => {
                                const newAges = [...prefs.age_enfants];
                                newAges[idx] = parseInt(e.target.value) || 0;
                                setPrefs({...prefs, age_enfants: newAges});
                              }}
                              placeholder={`Âge enfant ${idx + 1}`}
                            />
                          ))}
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPrefs({...prefs, age_enfants: [...prefs.age_enfants, 0]})}
                          >
                            + Ajouter un âge
                          </Button>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="adultes">Autres adultes au foyer</Label>
                      <Input
                        id="adultes"
                        type="number"
                        min="0"
                        max="10"
                        value={prefs.autres_adultes || ''}
                        onChange={(e) => setPrefs({...prefs, autres_adultes: parseInt(e.target.value) || null})}
                        placeholder="Ex: 1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Allergies des proches</Label>
                      {prefs.allergies_proches.map((item, idx) => (
                        <Input
                          key={idx}
                          value={item}
                          onChange={(e) => updateTextField('allergies_proches', idx, e.target.value)}
                          placeholder="Ex: Arachides"
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

            {/* Section 8: Style de vie */}
            <AccordionItem value="section8">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Heart className="w-5 h-5 text-primary" />
                      Ton mode de vie
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="stress">Niveau de stress</Label>
                      <Select value={prefs.niveau_stress} onValueChange={(v) => setPrefs({...prefs, niveau_stress: v})}>
                        <SelectTrigger id="stress">
                          <SelectValue placeholder="Sélectionne..." />
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
                        placeholder="Ex: 7.5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="motivation">Motivation principale</Label>
                      <Select value={prefs.motivation_principale} onValueChange={(v) => setPrefs({...prefs, motivation_principale: v})}>
                        <SelectTrigger id="motivation">
                          <SelectValue placeholder="Sélectionne..." />
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
                      <Label htmlFor="frein">Principal frein</Label>
                      <Select value={prefs.principal_frein} onValueChange={(v) => setPrefs({...prefs, principal_frein: v})}>
                        <SelectTrigger id="frein">
                          <SelectValue placeholder="Sélectionne..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="temps">Temps</SelectItem>
                          <SelectItem value="motivation">Motivation</SelectItem>
                          <SelectItem value="organisation">Organisation</SelectItem>
                          <SelectItem value="budget">Budget</SelectItem>
                          <SelectItem value="manque_infos">Manque d'infos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget_hebdo">Budget alimentaire hebdomadaire</Label>
                      <Select value={prefs.budget_hebdomadaire} onValueChange={(v) => setPrefs({...prefs, budget_hebdomadaire: v})}>
                        <SelectTrigger id="budget_hebdo">
                          <SelectValue placeholder="Sélectionne..." />
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
                            <SelectValue placeholder="Sélectionne..." />
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
                            <SelectValue placeholder="Sélectionne..." />
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
                      <Label htmlFor="lifestyle">Veux-tu aussi des conseils sport / sommeil / hydratation ?</Label>
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

          <div className="mt-8">
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="w-full" 
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Sauvegarde en cours...' : '💾 Sauvegarder mes préférences'}
            </Button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Clock, Users, MapPin, AlertCircle, Edit2, Lock } from 'lucide-react';

/** Age-based portion coefficient */
function childPortionCoeff(age: number): number {
  if (age <= 3) return 0.3;
  if (age <= 8) return 0.5;
  if (age <= 13) return 0.7;
  return 1.0;
}

export interface MealConfig {
  type: 'dejeuner' | 'diner';
  heure: string;
  quiMange: string; // 'tous' | 'parents' | 'enfants' | 'personnalise'
  membresSelectionnes: string[]; // for 'personnalise'
  portionsOverride: number | null;
  lieu: string;
}

interface MealCardSectionProps {
  repasParJour: number | null;
  meals: MealConfig[];
  onMealsChange: (meals: MealConfig[]) => void;
  adults: number;
  childrenAges: number[];
}

function defaultMeal(type: 'dejeuner' | 'diner'): MealConfig {
  return {
    type,
    heure: type === 'dejeuner' ? '12:30' : '19:30',
    quiMange: 'tous',
    membresSelectionnes: [],
    portionsOverride: null,
    lieu: 'maison',
  };
}

export function MealCardSection({
  repasParJour,
  meals,
  onMealsChange,
  adults,
  childrenAges,
}: MealCardSectionProps) {
  // Sync meal count with repasParJour
  useEffect(() => {
    if (!repasParJour) return;

    const needed: MealConfig[] = [];
    if (repasParJour >= 2) {
      needed.push(meals.find((m) => m.type === 'dejeuner') || defaultMeal('dejeuner'));
    }
    // Always include diner
    needed.push(meals.find((m) => m.type === 'diner') || defaultMeal('diner'));

    // Only update if structure changed
    if (needed.length !== meals.length || needed.some((m, i) => m.type !== meals[i]?.type)) {
      onMealsChange(needed);
    }
  }, [repasParJour]);

  if (!repasParJour || repasParJour < 1) return null;

  const updateMeal = (index: number, patch: Partial<MealConfig>) => {
    const updated = meals.map((m, i) => (i === index ? { ...m, ...patch } : m));
    onMealsChange(updated);
  };

  return (
    <div className="space-y-3 mt-4">
      {meals.map((meal, idx) => (
        <MealCard
          key={meal.type}
          meal={meal}
          index={idx}
          adults={adults}
          childrenAges={childrenAges}
          onChange={(patch) => updateMeal(idx, patch)}
        />
      ))}
    </div>
  );
}

function MealCard({
  meal,
  index,
  adults,
  childrenAges,
  onChange,
}: {
  meal: MealConfig;
  index: number;
  adults: number;
  childrenAges: number[];
  onChange: (patch: Partial<MealConfig>) => void;
}) {
  const [editingPortions, setEditingPortions] = useState(false);
  const label = meal.type === 'dejeuner' ? 'Déjeuner' : 'Dîner';

  const householdMembers = useMemo(() => {
    const members: { id: string; label: string; portions: number }[] = [];
    for (let i = 1; i <= adults; i++) {
      members.push({ id: `adulte_${i}`, label: `Adulte ${i}`, portions: 1 });
    }
    childrenAges.forEach((age, i) => {
      members.push({
        id: `enfant_${i}`,
        label: `Enfant ${i + 1} (${age} ans)`,
        portions: childPortionCoeff(age),
      });
    });
    return members;
  }, [adults, childrenAges]);

  const computedPortions = useMemo(() => {
    if (meal.portionsOverride !== null) return meal.portionsOverride;

    switch (meal.quiMange) {
      case 'tous':
        return householdMembers.reduce((s, m) => s + m.portions, 0);
      case 'parents':
        return adults;
      case 'enfants':
        return childrenAges.reduce((s, age) => s + childPortionCoeff(age), 0);
      case 'personnalise':
        return householdMembers
          .filter((m) => meal.membresSelectionnes.includes(m.id))
          .reduce((s, m) => s + m.portions, 0);
      default:
        return 1;
    }
  }, [meal.quiMange, meal.membresSelectionnes, meal.portionsOverride, householdMembers, adults, childrenAges]);

  const hasChildren =
    meal.quiMange === 'enfants' ||
    meal.quiMange === 'tous' ||
    (meal.quiMange === 'personnalise' &&
      meal.membresSelectionnes.some((id) => id.startsWith('enfant_')));

  const showNoRecipeNote =
    meal.lieu === 'ecole' || meal.lieu === 'restaurant';

  const lieuOptions = [
    { value: 'maison', label: 'À la maison' },
    { value: 'bureau', label: 'Au bureau' },
    { value: 'lunchbox', label: 'Lunch box' },
    { value: 'restaurant', label: 'Restaurant / Extérieur' },
    ...(hasChildren && childrenAges.length > 0
      ? [{ value: 'ecole', label: "À l'école" }]
      : []),
  ];

  return (
    <Card className="p-4 space-y-4 border-l-4 border-l-primary/40">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">{label}</span>
      </div>

      {/* Heure habituelle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Heure habituelle
          </Label>
          <Input
            type="time"
            value={meal.heure}
            onChange={(e) => onChange({ heure: e.target.value })}
          />
        </div>

        {/* Qui mange */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Qui mange à ce repas ?
          </Label>
          <MobileSelect
            value={meal.quiMange}
            onValueChange={(v) =>
              onChange({ quiMange: v, portionsOverride: null, membresSelectionnes: [] })
            }
            options={[
              { value: 'tous', label: 'Toute la famille' },
              { value: 'parents', label: 'Parents seulement' },
              { value: 'enfants', label: 'Enfants seulement' },
              { value: 'personnalise', label: 'Personnalisé' },
            ]}
          />
        </div>
      </div>

      {/* Personnalisé: checkboxes */}
      {meal.quiMange === 'personnalise' && householdMembers.length > 0 && (
        <div className="space-y-2 pl-1">
          <Label className="text-xs text-muted-foreground">Sélectionnez les membres :</Label>
          <div className="grid grid-cols-2 gap-2">
            {householdMembers.map((m) => (
              <div key={m.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`meal_${meal.type}_${m.id}`}
                  checked={meal.membresSelectionnes.includes(m.id)}
                  onCheckedChange={(checked) => {
                    const selected = checked
                      ? [...meal.membresSelectionnes, m.id]
                      : meal.membresSelectionnes.filter((id) => id !== m.id);
                    onChange({ membresSelectionnes: selected, portionsOverride: null });
                  }}
                />
                <Label htmlFor={`meal_${meal.type}_${m.id}`} className="text-sm">
                  {m.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portions + Lieu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Portions */}
        <div className="space-y-2">
          <Label className="text-sm">Portions</Label>
          <div className="flex items-center gap-2">
            {editingPortions ? (
              <Input
                type="number"
                min={0.5}
                max={20}
                step={0.5}
                value={meal.portionsOverride ?? computedPortions}
                onChange={(e) =>
                  onChange({ portionsOverride: parseFloat(e.target.value) || null })
                }
                className="w-24"
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {computedPortions.toFixed(1)} portions
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                if (editingPortions) {
                  // lock back
                  setEditingPortions(false);
                } else {
                  onChange({ portionsOverride: computedPortions });
                  setEditingPortions(true);
                }
              }}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              {editingPortions ? 'Verrouiller' : 'Modifier'}
            </Button>
          </div>
        </div>

        {/* Lieu */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            Où se prend ce repas ?
          </Label>
          <MobileSelect
            value={meal.lieu}
            onValueChange={(v) => onChange({ lieu: v })}
            options={lieuOptions}
          />
        </div>
      </div>

      {/* No recipe note */}
      {showNoRecipeNote && (
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 border border-border">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            NutriZen ne génèrera pas de recette pour ce repas.
          </p>
        </div>
      )}
    </Card>
  );
}

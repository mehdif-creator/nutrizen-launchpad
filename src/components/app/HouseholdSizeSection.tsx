import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, User, Baby } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HouseholdSizeSectionProps {
  userId: string;
}

export function HouseholdSizeSection({ userId }: HouseholdSizeSectionProps) {
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHouseholdInfo();
  }, [userId]);

  const fetchHouseholdInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('household_adults, household_children')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setAdults(data.household_adults ?? 1);
        setChildren(data.household_children ?? 0);
      }
    } catch (error) {
      console.error('Error fetching household info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          household_adults: adults,
          household_children: children,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Taille du foyer mise à jour', {
        description: 'Tes prochains menus seront adaptés automatiquement.',
      });
    } catch (error) {
      console.error('Error saving household info:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const effectiveSize = adults + children * 0.7;
  const hasChanges = true; // Could track if values changed from DB

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Taille de ton foyer</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Les portions de tes menus et ta liste de courses seront automatiquement adaptées au nombre de personnes dans ton foyer.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Adults */}
        <div className="space-y-3">
          <Label htmlFor="adults" className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Nombre d'adultes
          </Label>
          <Input
            id="adults"
            type="number"
            min={0}
            max={10}
            step={1}
            value={adults}
            onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))}
            className="text-center text-lg font-semibold"
          />
          <p className="text-xs text-muted-foreground">
            1 portion = 1 adulte
          </p>
        </div>

        {/* Children */}
        <div className="space-y-3">
          <Label htmlFor="children" className="flex items-center gap-2">
            <Baby className="h-4 w-4 text-muted-foreground" />
            Nombre d'enfants
          </Label>
          <Input
            id="children"
            type="number"
            min={0}
            max={10}
            step={1}
            value={children}
            onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
            className="text-center text-lg font-semibold"
          />
          <p className="text-xs text-muted-foreground">
            1 portion = 0,7 adulte
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Portions équivalentes</p>
            <p className="text-xs text-muted-foreground mt-1">
              {adults} adulte{adults > 1 ? 's' : ''} + {children} enfant{children > 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {effectiveSize.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">portions</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || adults < 0 || children < 0}
          className="gap-2"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Astuce :</strong> Pour appliquer ces changements à ton menu actuel, génère un nouveau menu hebdomadaire. Les menus existants ne seront pas modifiés rétroactivement.
        </p>
      </div>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Bug } from 'lucide-react';

interface DebugData {
  wallet: {
    balance_purchased?: number;
    balance_allowance?: number;
    reset_cadence?: string;
    last_reset_at?: string;
    next_reset_at?: string;
    allowance_amount?: number;
  } | null;
  profile: {
    onboarding_status?: string;
    onboarding_step?: number;
    required_fields_ok?: boolean;
    household_adults?: number;
    household_children?: number;
    kid_portion_ratio?: number;
    portion_strategy?: string;
  } | null;
  portions: {
    effective_servings_per_meal?: number;
    rounded_servings?: number;
  } | null;
}

export function AdminDebugPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<DebugData>({ wallet: null, profile: null, portions: null });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchDebugData = async () => {
      setLoading(true);
      try {
        // Fetch wallet
        const { data: wallet } = await supabase
          .from('user_wallets')
          .select('balance_purchased, balance_allowance, reset_cadence, last_reset_at, next_reset_at, allowance_amount')
          .eq('user_id', userId)
          .single();

        // Fetch profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_status, onboarding_step, required_fields_ok, household_adults, household_children, kid_portion_ratio, portion_strategy')
          .eq('id', userId)
          .single();

        // Fetch effective portions
        const { data: portions } = await supabase.rpc('rpc_get_effective_portions', {
          p_user_id: userId,
          p_week_start: null,
        });

        setData({
          wallet: wallet || null,
          profile: profile || null,
          portions: portions as any,
        });
      } catch (error) {
        console.error('[AdminDebugPanel] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDebugData();
  }, [isOpen, userId]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-6">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bug className="h-4 w-4" />
          Debug Panel
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <Card className="bg-muted/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Données de debug</CardTitle>
            <CardDescription className="text-xs">Informations internes du profil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {loading ? (
              <div className="text-muted-foreground">Chargement...</div>
            ) : (
              <>
                {/* Credits Reset */}
                <div>
                  <div className="font-medium mb-2 flex items-center gap-2">
                    Crédits Reset
                    <Badge variant="outline" className="text-xs">{data.wallet?.reset_cadence || 'N/A'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Achetés: {data.wallet?.balance_purchased ?? 'N/A'}</div>
                    <div>Allowance: {data.wallet?.balance_allowance ?? 'N/A'}</div>
                    <div>Montant: {data.wallet?.allowance_amount ?? 'N/A'}</div>
                    <div>Dernier reset: {data.wallet?.last_reset_at ? new Date(data.wallet.last_reset_at).toLocaleDateString() : 'Jamais'}</div>
                    <div className="col-span-2">Prochain: {data.wallet?.next_reset_at ? new Date(data.wallet.next_reset_at).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>

                {/* Onboarding */}
                <div>
                  <div className="font-medium mb-2 flex items-center gap-2">
                    Onboarding
                    <Badge 
                      variant={data.profile?.onboarding_status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {data.profile?.onboarding_status || 'N/A'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Étape: {data.profile?.onboarding_step ?? 'N/A'}</div>
                    <div>Champs OK: {data.profile?.required_fields_ok ? 'Oui' : 'Non'}</div>
                  </div>
                </div>

                {/* Portions */}
                <div>
                  <div className="font-medium mb-2 flex items-center gap-2">
                    Portions
                    <Badge variant="outline" className="text-xs">{data.profile?.portion_strategy || 'household'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Adultes: {data.profile?.household_adults ?? 1}</div>
                    <div>Enfants: {data.profile?.household_children ?? 0}</div>
                    <div>Ratio enfant: {data.profile?.kid_portion_ratio ?? 0.6}</div>
                    <div>Effectif: {(data.portions as any)?.effective_servings_per_meal?.toFixed(1) ?? 'N/A'}</div>
                    <div className="col-span-2">Arrondi: {(data.portions as any)?.rounded_servings ?? 'N/A'} portions</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

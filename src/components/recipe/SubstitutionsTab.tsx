import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Sparkles, Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { InsufficientCreditsModal } from '@/components/app/InsufficientCreditsModal';
import { getCreditsBalance } from '@/lib/credits';
import { getFeatureCost } from '@/lib/featureCosts';
import { callEdgeFunction } from '@/lib/edgeFn';

interface Substitution {
  name: string;
  reason?: string;
  notes?: string;
}

interface SubstitutionResponse {
  substitutions?: (string | Substitution)[];
  cached?: boolean;
  credits_charged?: number;
  duplicate?: boolean;
  error?: string;
  error_code?: string;
  current_balance?: number;
  required?: number;
}

interface SubstitutionsTabProps {
  recipeId: string;
  ingredients: Array<string | { name?: string; ingredient?: string }>;
}

const SUBSTITUTION_COST = getFeatureCost('substitutions'); // 1 credit (from featureCosts.ts, synced with DB)

export function SubstitutionsTab({ recipeId, ingredients }: SubstitutionsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState({ current: 0, required: SUBSTITUTION_COST });

  // Normalize ingredients to strings
  const ingredientNames = ingredients.map(ing => {
    if (typeof ing === 'string') return ing;
    return ing.name || ing.ingredient || '';
  }).filter(Boolean);

  const handleFindSubstitutions = async () => {
    if (!selectedIngredient || !user?.id) return;

    // Generate unique request_id for idempotency
    const requestId = crypto.randomUUID();

    setIsLoading(true);
    setSubstitutions([]);

    try {
      // Check credits first (client-side pre-check)
      const balance = await getCreditsBalance(user.id);
      if (!balance || balance.total < SUBSTITUTION_COST) {
        setCreditsInfo({
          current: balance?.total || 0,
          required: SUBSTITUTION_COST,
        });
        setShowCreditsModal(true);
        setIsLoading(false);
        return;
      }

      // Use callEdgeFunction for reliable auth header transmission
      const data = await callEdgeFunction<SubstitutionResponse>('suggest-substitution', {
        ingredient: selectedIngredient,
        recipe_id: recipeId,
        request_id: requestId,
      });

      // Check for error in the response body (e.g., insufficient credits, API error)
      if (data.error_code === 'INSUFFICIENT_CREDITS') {
        setCreditsInfo({
          current: data.current_balance ?? 0,
          required: data.required ?? SUBSTITUTION_COST,
        });
        setShowCreditsModal(true);
        return;
      }

      if (data.error && (!data.substitutions || data.substitutions.length === 0)) {
        toast({
          title: 'Erreur',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      // Parse substitutions from response
      const subs: Substitution[] = (data.substitutions || []).map((s: string | Substitution) => {
        if (typeof s === 'string') {
          return { name: s };
        }
        return s;
      });

      setSubstitutions(subs);

      if (subs.length === 0) {
        toast({
          title: 'Aucune alternative trouvée',
          description: 'Essayez avec un autre ingrédient.',
        });
      }
    } catch (error: any) {
      console.error('Error finding substitutions:', error);
      
      // Check if the error message indicates insufficient credits
      const errorMsg = error?.message || '';
      if (errorMsg.includes('insuffisant') || errorMsg.includes('INSUFFICIENT')) {
        const balance = await getCreditsBalance(user.id);
        setCreditsInfo({
          current: balance?.total || 0,
          required: SUBSTITUTION_COST,
        });
        setShowCreditsModal(true);
        return;
      }

      toast({
        title: 'Erreur',
        description: errorMsg || 'Impossible de trouver des alternatives.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({
      title: 'Copié !',
      description: 'Alternative copiée dans le presse-papiers.',
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Cost info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Coût : {SUBSTITUTION_COST} crédits par recherche</span>
        </div>

        {/* Ingredient selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Choisir un ingrédient</label>
          <div className="flex gap-2">
            <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sélectionner un ingrédient…" />
              </SelectTrigger>
              <SelectContent>
                {ingredientNames.map((ing, idx) => (
                  <SelectItem key={idx} value={ing}>
                    {ing}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleFindSubstitutions}
              disabled={!selectedIngredient || isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Trouver une alternative</span>
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </Card>
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && substitutions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Alternatives pour : {selectedIngredient}</h4>
            {substitutions.map((sub, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Alternative #{idx + 1}</Badge>
                      <span className="font-medium">{sub.name}</span>
                    </div>
                    {sub.reason && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Pourquoi ?</strong> {sub.reason}
                      </p>
                    )}
                    {sub.notes && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Conseil :</strong> {sub.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(sub.name, idx)}
                  >
                    {copiedIndex === idx ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !selectedIngredient && substitutions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Sélectionnez un ingrédient pour obtenir des alternatives saines.</p>
          </div>
        )}
      </div>

      <InsufficientCreditsModal
        open={showCreditsModal}
        onOpenChange={setShowCreditsModal}
        currentBalance={creditsInfo.current}
        required={creditsInfo.required}
        feature="substitution"
      />
    </>
  );
}
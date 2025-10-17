import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

interface IngredientSubstitutionProps {
  ingredient: string;
  onSubstitute?: (newIngredient: string) => void;
}

export const IngredientSubstitution = ({ ingredient, onSubstitute }: IngredientSubstitutionProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [substitutions, setSubstitutions] = useState<string[]>([]);
  const { toast } = useToast();

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-substitution', {
        body: { ingredient }
      });

      if (error) throw error;

      setSubstitutions(data.substitutions || []);
    } catch (error) {
      console.error('Error getting substitutions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer les alternatives',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    getSuggestions();
  };

  const handleSelect = (substitution: string) => {
    onSubstitute?.(substitution);
    toast({
      title: 'Substitution appliquée',
      description: `${ingredient} remplacé par ${substitution}`,
    });
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="text-primary hover:text-primary/80"
      >
        <RefreshCw className="h-4 w-4 mr-1" />
        Remplacer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alternatives pour : {ingredient}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Alternatives saines recommandées :
                </p>
                {substitutions.map((sub, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleSelect(sub)}
                  >
                    {sub}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

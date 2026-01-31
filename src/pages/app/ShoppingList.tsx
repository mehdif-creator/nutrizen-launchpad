import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShoppingCart, 
  Download, 
  RefreshCw, 
  Check, 
  X, 
  ChefHat,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface GroceryItem {
  ingredient_key: string;
  name: string;
  quantity: number;
  unit: string;
  recipe_sources: string[];
  category: string;
  checked: boolean;
}

interface GroceryList {
  id: string;
  weekly_menu_id: string;
  generated_at: string;
  items: GroceryItem[];
}

// Category icons mapping
const categoryIcons: Record<string, string> = {
  'Fruits & Légumes': '🥦',
  'Viandes & Poissons': '🥩',
  'Produits laitiers': '🧀',
  'Féculents': '🍚',
  'Épicerie': '🫙',
  'Surgelés': '🧊',
  'Boissons': '🥤',
  'Divers': '📦',
};

export default function ShoppingList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [weekStart, setWeekStart] = useState<string>('');

  // Calculate current week start
  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStartDate = new Date(now);
    weekStartDate.setDate(now.getDate() + diff);
    weekStartDate.setHours(0, 0, 0, 0);
    setWeekStart(weekStartDate.toISOString().split('T')[0]);
  }, []);

  // Fetch grocery list
  useEffect(() => {
    if (!user?.id || !weekStart) return;

    const fetchGroceryList = async () => {
      setIsLoading(true);
      try {
        // First get the weekly menu
        const { data: menu, error: menuError } = await supabase
          .from('user_weekly_menus')
          .select('menu_id')
          .eq('user_id', user.id)
          .eq('week_start', weekStart)
          .maybeSingle();

        if (menuError) throw menuError;

        if (!menu) {
          setGroceryList(null);
          setIsLoading(false);
          return;
        }

        // Then get the grocery list for this menu
        const { data: list, error: listError } = await supabase
          .from('grocery_lists')
          .select('*')
          .eq('weekly_menu_id', menu.menu_id)
          .maybeSingle();

        if (listError && listError.code !== 'PGRST116') throw listError;

        if (list) {
          // Parse items if needed
          const items = Array.isArray(list.items) 
            ? list.items 
            : (typeof list.items === 'string' ? JSON.parse(list.items) : []);
          
          setGroceryList({
            id: list.id,
            weekly_menu_id: list.weekly_menu_id,
            generated_at: list.generated_at,
            items: items as GroceryItem[],
          });
        } else {
          // No list yet - generate one
          await handleRegenerate(menu.menu_id);
        }
      } catch (error) {
        console.error('Error fetching grocery list:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la liste de courses.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroceryList();
  }, [user?.id, weekStart]);

  const handleRegenerate = async (menuId?: string) => {
    if (!user?.id) return;

    setIsRegenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-grocery-list', {
        body: menuId ? { weekly_menu_id: menuId } : {},
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success && data.items) {
        setGroceryList({
          id: data.grocery_list_id,
          weekly_menu_id: menuId || '',
          generated_at: data.generated_at || new Date().toISOString(),
          items: data.items,
        });
        toast({
          title: '✅ Liste mise à jour',
          description: `${data.items.length} ingrédients dans ta liste.`,
        });
      }
    } catch (error) {
      console.error('Error regenerating grocery list:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de régénérer la liste.',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleToggleItem = async (ingredientKey: string, checked: boolean) => {
    if (!groceryList?.id) return;

    // Optimistic update
    setGroceryList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item =>
          item.ingredient_key === ingredientKey ? { ...item, checked } : item
        ),
      };
    });

    // Persist to database
    try {
      const { error } = await supabase.rpc('update_grocery_item_checked', {
        p_grocery_list_id: groceryList.id,
        p_ingredient_key: ingredientKey,
        p_checked: checked,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating item:', error);
      // Revert optimistic update
      setGroceryList(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item =>
            item.ingredient_key === ingredientKey ? { ...item, checked: !checked } : item
          ),
        };
      });
    }
  };

  const handleCheckAll = async (checked: boolean) => {
    if (!groceryList) return;

    setGroceryList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item => ({ ...item, checked })),
      };
    });

    // Persist all changes
    for (const item of groceryList.items) {
      await supabase.rpc('update_grocery_item_checked', {
        p_grocery_list_id: groceryList.id,
        p_ingredient_key: item.ingredient_key,
        p_checked: checked,
      });
    }
  };

  const handleExport = () => {
    if (!groceryList?.items) return;

    // Group by category
    const grouped = groceryList.items.reduce((acc, item) => {
      const cat = item.category || 'Divers';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, GroceryItem[]>);

    // Build text content
    let content = `Liste de courses - Semaine du ${formatDate(weekStart)}\n\n`;
    
    Object.entries(grouped).forEach(([category, items]) => {
      content += `${categoryIcons[category] || '📦'} ${category}\n`;
      items.forEach(item => {
        const check = item.checked ? '✓' : '○';
        content += `  ${check} ${item.name} (${item.quantity} ${item.unit})\n`;
      });
      content += '\n';
    });

    // Download as text file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liste-courses-${weekStart}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: '📥 Liste téléchargée',
      description: 'Ta liste de courses est prête.',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
    });
  };

  // Group items by category
  const groupedItems = groceryList?.items.reduce((acc, item) => {
    const cat = item.category || 'Divers';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>) || {};

  const checkedCount = groceryList?.items.filter(i => i.checked).length || 0;
  const totalCount = groceryList?.items.length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8 px-4">
          <div className="mb-6">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-32 mb-3" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!groceryList || groceryList.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8 px-4">
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Aucune liste de courses</h2>
            <p className="text-muted-foreground mb-6">
              Génère d'abord ton menu de la semaine pour créer ta liste de courses.
            </p>
            <Button onClick={() => navigate('/app')}>
              <ChefHat className="h-4 w-4 mr-2" />
              Aller au tableau de bord
            </Button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-4 md:py-8 px-4">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                Liste de courses
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Semaine du {formatDate(weekStart)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {checkedCount}/{totalCount} cochés
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleRegenerate()}
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
              Régénérer
            </Button>
            <Button variant="outline" onClick={() => handleCheckAll(true)}>
              <Check className="h-4 w-4 mr-2" />
              Tout cocher
            </Button>
            <Button variant="outline" onClick={() => handleCheckAll(false)}>
              <X className="h-4 w-4 mr-2" />
              Tout décocher
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <Card className="p-3 mb-6 bg-muted/50">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Basé sur ton menu de la semaine. Les quantités sont adaptées à ton foyer.
          </p>
        </Card>

        {/* Shopping list by category */}
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category} className="p-4 md:p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>{categoryIcons[category] || '📦'}</span>
                {category}
                <Badge variant="outline" className="ml-auto text-xs">
                  {items.filter(i => i.checked).length}/{items.length}
                </Badge>
              </h2>
              
              <ul className="space-y-3">
                {items.map((item) => (
                  <li 
                    key={item.ingredient_key}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      item.checked ? 'bg-muted/50' : 'hover:bg-muted/30'
                    }`}
                  >
                    <Checkbox
                      id={item.ingredient_key}
                      checked={item.checked}
                      onCheckedChange={(checked) => 
                        handleToggleItem(item.ingredient_key, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={item.ingredient_key}
                      className={`flex-1 cursor-pointer ${
                        item.checked ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({item.quantity} {item.unit})
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Generated timestamp */}
        {groceryList.generated_at && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            Dernière mise à jour : {new Date(groceryList.generated_at).toLocaleString('fr-FR')}
          </p>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

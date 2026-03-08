import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Download,
  RefreshCw,
  Check,
  X,
  ChefHat,
  FileDown,
} from 'lucide-react';
import { exportShoppingListPdf } from '@/lib/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { LoadingMessages } from '@/components/common/LoadingMessages';
import {
  mergeShoppingItems,
  CATEGORY_ORDER,
  CATEGORY_ICONS,
  type RawShoppingItem,
  type MergedShoppingItem,
} from '@/lib/shoppingListUtils';

interface DisplayItem extends MergedShoppingItem {
  checked: boolean;
}

const STORAGE_KEY_PREFIX = 'nutrizen_shopping_checked_';

export default function ShoppingList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<DisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weekStart, setWeekStart] = useState('');

  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStartMs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diff
    );
    setWeekStart(new Date(weekStartMs).toISOString().split('T')[0]);
  }, []);

  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}${weekStart}` : null;

  const loadCheckedState = useCallback((): Record<string, boolean> => {
    if (!storageKey) return {};
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  }, [storageKey]);

  const saveCheckedState = useCallback((checked: Record<string, boolean>) => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [storageKey]);

  const fetchList = useCallback(async (showRefreshing = false) => {
    if (!user?.id || !weekStart) return;
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        'get_shopping_list_from_weekly_menu',
        { p_user_id: user.id, p_week_start: weekStart }
      );

      if (error) throw error;

      const rawItems: RawShoppingItem[] = (data || []).map((row: any) => ({
        ingredient_name: row.ingredient_name,
        total_quantity: row.total_quantity,
        unit: row.unit,
        formatted_display: row.formatted_display,
      }));

      // Merge & deduplicate through the pipeline
      const merged = mergeShoppingItems(rawItems);

      const checkedState = loadCheckedState();

      const displayItems: DisplayItem[] = merged.map(m => ({
        ...m,
        checked: checkedState[m.normalizedKey] ?? false,
      }));

      setItems(displayItems);
    } catch (err) {
      console.error('Error fetching shopping list:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la liste de courses.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, weekStart, loadCheckedState, toast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleToggle = (key: string, checked: boolean) => {
    setItems(prev => prev.map(item =>
      item.normalizedKey === key ? { ...item, checked } : item
    ));
    const current = loadCheckedState();
    current[key] = checked;
    saveCheckedState(current);
  };

  const handleCheckAll = (checked: boolean) => {
    setItems(prev => prev.map(item => ({ ...item, checked })));
    const newState: Record<string, boolean> = {};
    items.forEach(item => { newState[item.normalizedKey] = checked; });
    saveCheckedState(newState);
  };

  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const header = 'Catégorie;Article;Coché';
    const rows = items.map(item =>
      [
        item.category,
        `"${item.displayLine.replace(/"/g, '""')}"`,
        item.checked ? 'Oui' : 'Non',
      ].join(';')
    );
    const csv = BOM + [header, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liste-courses-${weekStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '📥 Liste téléchargée', description: 'Format CSV prêt pour Excel.' });
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, DisplayItem[]>);

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8 px-4">
          <div className="py-12">
            <LoadingMessages
              variant="grocery"
              isLoading={true}
              skeletonCount={4}
              minDisplayMs={400}
            />
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (items.length === 0) {
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
            <Badge variant="secondary" className="text-sm self-start sm:self-auto">
              {checkedCount}/{totalCount} cochés
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => fetchList(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button variant="outline" onClick={() => handleCheckAll(true)}>
              <Check className="h-4 w-4 mr-2" />
              Tout cocher
            </Button>
            <Button variant="outline" onClick={() => handleCheckAll(false)}>
              <X className="h-4 w-4 mr-2" />
              Tout décocher
            </Button>
            <Button onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                exportShoppingListPdf(weekStart, items);
                toast({ title: '📥 PDF téléchargé', description: 'Liste de courses en PDF.' });
              }}
            >
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* List by category */}
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, catItems]) => (
            <Card key={category} className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <span>{CATEGORY_ICONS[category] || '📦'}</span>
                  {category}
                </h2>
                <Badge variant="outline" className="text-xs">
                  {catItems.filter(i => i.checked).length}/{catItems.length}
                </Badge>
              </div>

              <ul className="space-y-2">
                {catItems.map(item => (
                  <li
                    key={item.normalizedKey}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      item.checked ? 'bg-muted/50' : 'hover:bg-muted/30'
                    }`}
                    onClick={() => handleToggle(item.normalizedKey, !item.checked)}
                  >
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        item.checked
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {item.checked && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span
                      className={`flex-1 text-sm ${
                        item.checked ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {item.displayLine}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {progress === 100 && totalCount > 0 && (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-semibold text-lg">Courses terminées !</p>
            <p className="text-sm text-muted-foreground">Tout est dans le panier.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6">
          {totalCount} articles • Adapté à ton foyer
        </p>
      </main>

      <AppFooter />
    </div>
  );
}

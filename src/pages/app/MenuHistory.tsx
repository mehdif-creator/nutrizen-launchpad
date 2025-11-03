import { AppHeader } from "@/components/app/AppHeader";
import { AppFooter } from "@/components/app/AppFooter";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChefHat } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MenuHistoryItem {
  menu_id: string;
  week_start: string;
  created_at: string;
  payload: {
    days: Array<{
      day: string;
      title: string;
      recipe_id: string;
    }>;
  };
  used_fallback: string | null;
}

export default function MenuHistory() {
  const { user } = useAuth();

  const { data: menuHistory, isLoading } = useQuery({
    queryKey: ["menuHistory", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_weekly_menus")
        .select("menu_id, week_start, created_at, payload, used_fallback")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as MenuHistoryItem[];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <AppHeader />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Historique des menus</h1>
            <p className="text-muted-foreground">
              Retrouve tous les menus que tu as générés
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement de l'historique...</p>
            </div>
          ) : !menuHistory || menuHistory.length === 0 ? (
            <Card className="rounded-2xl border shadow-sm p-8 text-center">
              <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucun menu généré</h3>
              <p className="text-muted-foreground">
                Commence par générer ton premier menu hebdomadaire !
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {menuHistory.map((menu) => {
                const weekStartDate = new Date(menu.week_start);
                const recipeCount = menu.payload?.days?.length || 0;

                return (
                  <Card
                    key={menu.menu_id}
                    className="rounded-2xl border shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-primary/10 rounded-full p-3">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">
                            Semaine du {format(weekStartDate, "d MMMM yyyy", { locale: fr })}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Généré le {format(new Date(menu.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {recipeCount} recettes
                            </Badge>
                            {menu.used_fallback && (
                              <Badge variant="secondary" className="text-xs">
                                {menu.used_fallback}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-sm text-muted-foreground mb-2">Recettes</div>
                        <div className="space-y-1">
                          {menu.payload?.days?.slice(0, 3).map((day, index) => (
                            <div key={index} className="text-xs text-muted-foreground">
                              {day.day}: {day.title}
                            </div>
                          ))}
                          {recipeCount > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{recipeCount - 3} autres...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

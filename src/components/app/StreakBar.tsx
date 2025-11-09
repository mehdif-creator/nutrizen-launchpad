import { Card } from "@/components/ui/card";
import { Flame, Trophy, Award, Sparkles } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export function StreakBar() {
  const { user } = useAuth();
  const { gamification, levelName, levelColor } = useGamification(user?.id);
  const { stats } = useDashboardStats(user?.id);

  return (
    <Card className="rounded-2xl border shadow-sm p-4 md:p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Série */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-3 shadow-lg">
            <Flame className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {gamification.streak_days}
              <span className="text-sm text-muted-foreground ml-1">jours</span>
            </div>
            <div className="text-xs text-muted-foreground">Série actuelle</div>
          </div>
        </div>

        {/* Niveau */}
        <div className="flex items-center gap-3">
          <div className={cn("rounded-xl p-3 shadow-lg", 
            levelName === "Bronze" ? "bg-gradient-to-br from-amber-600 to-amber-800" :
            levelName === "Silver" ? "bg-gradient-to-br from-gray-300 to-gray-500" :
            levelName === "Gold" ? "bg-gradient-to-br from-yellow-400 to-yellow-600" :
            "bg-gradient-to-br from-blue-400 to-blue-600"
          )}>
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold">{levelName}</div>
            <div className="text-xs text-muted-foreground">{gamification.points} points</div>
          </div>
        </div>

        {/* Crédits */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-3 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.credits_zen}</div>
            <div className="text-xs text-muted-foreground">Crédits restants</div>
          </div>
        </div>

        {/* Références */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 shadow-lg">
            <Award className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.references_count}</div>
            <div className="text-xs text-muted-foreground">Références</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

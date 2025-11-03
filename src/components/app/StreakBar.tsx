import { Card } from "@/components/ui/card";
import { Flame, Trophy } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function StreakBar() {
  const { user } = useAuth();
  const { gamification, levelName, levelColor } = useGamification(user?.id);

  // For demo purposes, show current streak
  // In production, you'd track which days were completed
  const currentDayIndex = new Date().getDay();
  const mondayBasedIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;

  return (
    <Card className="rounded-2xl border shadow-sm p-4 md:p-6 bg-gradient-to-r from-primary/5 via-background to-primary/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Streak info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-full p-2">
              <Flame className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold">
                {gamification.streak_days}
                <span className="text-sm md:text-base text-muted-foreground ml-1">jours</span>
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Série actuelle</div>
            </div>
          </div>

          <div className="h-12 w-px bg-border" />

          <div className="flex items-center gap-2">
            <div className="bg-secondary/10 rounded-full p-2">
              <Trophy className={cn("h-5 w-5 md:h-6 md:w-6", levelColor)} />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold">{levelName}</div>
              <div className="text-xs md:text-sm text-muted-foreground">{gamification.points} points</div>
            </div>
          </div>
        </div>

        {/* Right: Week progress */}
        <div className="w-full sm:w-auto">
          <div className="text-xs text-muted-foreground mb-2">Cette semaine</div>
          <div className="flex items-center gap-1.5 md:gap-2">
            {WEEKDAYS.map((day, index) => {
              const isCompleted = index <= mondayBasedIndex && gamification.streak_days > 0;
              const isToday = index === mondayBasedIndex;

              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col items-center gap-1",
                    "transition-all duration-200"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center",
                      "text-xs md:text-sm font-medium transition-all duration-200",
                      isCompleted
                        ? "bg-primary text-primary-foreground shadow-lg scale-110"
                        : isToday
                        ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Flame className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      day
                    )}
                  </div>
                  <div className={cn(
                    "text-[10px] md:text-xs font-medium",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}>
                    {day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

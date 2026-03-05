import { Card } from '@/components/ui/card';
import { usePointRules } from '@/hooks/useGamificationV2';
import { Info } from 'lucide-react';

export function PointRulesCard() {
  const { data: rules = [] } = usePointRules();

  if (rules.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Comment gagner des points</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rules.map((rule) => (
          <div
            key={rule.event_type}
            className="flex items-center justify-between py-1.5 px-3 rounded bg-muted/50"
          >
            <span className="text-sm">{rule.label_fr}</span>
            <span className="text-sm font-semibold text-primary">
              +{rule.points} pts
              {rule.max_per_day && (
                <span className="text-xs text-muted-foreground ml-1">
                  (max {rule.max_per_day}/j)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

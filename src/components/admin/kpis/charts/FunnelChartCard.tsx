import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { BreakdownRow } from '@/lib/adminKpis';
import { cn } from '@/lib/utils';

interface FunnelChartCardProps {
  title: string;
  description?: string;
  data: BreakdownRow[];
  isLoading?: boolean;
}

const STEP_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-pink-500',
];

export function FunnelChartCard({
  title,
  description,
  data,
  isLoading,
}: FunnelChartCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-1 flex items-center gap-2">
                <Skeleton className="h-24 w-full rounded-lg" />
                {i < 3 && <Skeleton className="h-6 w-6" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          {data.map((step, index) => {
            const widthPercentage = maxCount > 0 ? (step.value / maxCount) * 100 : 0;
            
            return (
              <div key={step.segment} className="flex-1 flex items-center gap-2">
                <Card 
                  className={cn(
                    "flex-1 p-4 text-center border-2 transition-colors",
                    step.value > 0 ? "hover:border-primary/50" : "opacity-50"
                  )}
                >
                  {/* Mini bar indicator */}
                  <div className="h-2 bg-muted rounded-full mb-3 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full", STEP_COLORS[index % STEP_COLORS.length])}
                      style={{ width: `${widthPercentage}%` }}
                    />
                  </div>
                  
                  <p className="text-2xl font-bold">{step.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{step.segment}</p>
                  
                  {step.percentage !== undefined && step.percentage > 0 && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {step.percentage.toFixed(1)}% conv.
                    </Badge>
                  )}
                </Card>
                
                {index < data.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Overall conversion rate */}
        {data.length >= 2 && data[0].value > 0 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Taux global: {' '}
            <span className="font-bold text-primary">
              {((data[data.length - 1].value / data[0].value) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

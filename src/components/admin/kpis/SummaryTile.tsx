import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label?: string;
  };
  isLoading?: boolean;
}

export function SummaryTile({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  isLoading,
}: SummaryTileProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold">
            {typeof value === 'number' ? value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              "text-xs mt-1 font-medium",
              trend.value >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
              {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
            </p>
          )}
        </div>
        {Icon && <Icon className={cn("h-8 w-8", iconColor)} />}
      </div>
    </Card>
  );
}

export function SummaryTilesGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {children}
    </div>
  );
}

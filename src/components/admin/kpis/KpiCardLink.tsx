import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardLinkProps {
  to: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function KpiCardLink({
  to,
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  className,
}: KpiCardLinkProps) {
  return (
    <Link to={to} className="block group">
      <Card className={cn(
        "p-6 transition-all duration-200",
        "hover:shadow-lg hover:border-primary/50 hover:scale-[1.02]",
        "cursor-pointer relative overflow-hidden",
        className
      )}>
        {/* Hover indicator */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-sm mt-1 font-medium",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
          <Icon className={cn("h-10 w-10", iconColor)} />
        </div>
      </Card>
    </Link>
  );
}

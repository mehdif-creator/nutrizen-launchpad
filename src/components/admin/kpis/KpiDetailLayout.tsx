import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppFooter } from '@/components/app/AppFooter';
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  Calendar,
  Loader2 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRange, Granularity, getDateRange } from '@/lib/adminKpis';

interface KpiDetailLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  granularity?: Granularity;
  onGranularityChange?: (g: Granularity) => void;
  showGranularity?: boolean;
  filters?: ReactNode;
}

export function KpiDetailLayout({
  title,
  subtitle,
  children,
  onRefresh,
  onExport,
  isLoading,
  dateRange,
  onDateRangeChange,
  granularity,
  onGranularityChange,
  showGranularity = true,
  filters,
}: KpiDetailLayoutProps) {
  const { from, to } = getDateRange(dateRange);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range */}
            <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRange)}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
                <SelectItem value="12m">12 mois</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Granularity */}
            {showGranularity && granularity && onGranularityChange && (
              <Select value={granularity} onValueChange={(v) => onGranularityChange(v as Granularity)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Jour</SelectItem>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* Extra filters */}
            {filters}
            
            {/* Export */}
            {onExport && (
              <Button variant="outline" size="icon" onClick={onExport} disabled={isLoading}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            {/* Refresh */}
            {onRefresh && (
              <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* Date range info */}
        <div className="mb-6 text-sm text-muted-foreground">
          Période: {from} → {to}
        </div>

        {/* Content */}
        {children}
      </main>
      
      <AppFooter />
    </div>
  );
}

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { BillingInterval } from '@/config/pricing';

interface BillingToggleProps {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  /** Override the savings label shown next to "Annuel". */
  savingsLabel?: string;
  className?: string;
}

/**
 * Premium monthly/yearly toggle.
 * Mobile-first, 44px minimum touch targets, fully keyboard-accessible.
 */
export const BillingToggle = ({
  value,
  onChange,
  savingsLabel = '2 mois offerts',
  className,
}: BillingToggleProps) => {
  const isYearly = value === 'year';

  return (
    <div
      role="tablist"
      aria-label="Période de facturation"
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-full border border-border bg-muted/40 backdrop-blur-sm shadow-sm',
        className,
      )}
    >
      <button
        role="tab"
        type="button"
        aria-selected={!isYearly}
        onClick={() => onChange('month')}
        className={cn(
          'min-h-[44px] px-5 rounded-full text-sm font-semibold transition-all duration-300',
          !isYearly
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Mensuel
      </button>
      <button
        role="tab"
        type="button"
        aria-selected={isYearly}
        onClick={() => onChange('year')}
        className={cn(
          'min-h-[44px] px-5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2',
          isYearly
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Annuel
        <Badge
          className={cn(
            'text-[10px] font-bold py-0 px-2 transition-colors',
            isYearly
              ? 'bg-green-500/15 text-green-600 hover:bg-green-500/20 border-transparent'
              : 'bg-muted text-muted-foreground border-transparent',
          )}
        >
          {savingsLabel}
        </Badge>
      </button>
    </div>
  );
};

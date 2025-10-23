import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InfoBannerProps {
  message: string;
  variant?: 'info' | 'warning' | 'success';
  onDismiss?: () => void;
  className?: string;
}

export function InfoBanner({ 
  message, 
  variant = 'info', 
  onDismiss,
  className 
}: InfoBannerProps) {
  const variants = {
    info: 'bg-primary/10 border-primary/20 text-primary',
    warning: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',
    success: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
  };

  return (
    <div 
      className={cn(
        'relative flex items-center gap-3 p-4 rounded-xl border text-sm',
        variants[variant],
        className
      )}
      role="alert"
    >
      <Info className="h-4 w-4 flex-shrink-0" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onDismiss}
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

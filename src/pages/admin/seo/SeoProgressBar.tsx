import { CheckCircle, Circle } from 'lucide-react';
import { PIPELINE_STEPS, STATUS_ORDER } from './types';
import { cn } from '@/lib/utils';

interface Props {
  status: string;
}

export function SeoProgressBar({ status }: Props) {
  const currentIdx = STATUS_ORDER[status] ?? -1;

  return (
    <div className="flex items-center gap-1 mt-2">
      {PIPELINE_STEPS.map((step, i) => {
        const stepIdx = i + 1; // serp_done=1, brief_done=2, etc.
        const done = currentIdx >= stepIdx;
        const active = currentIdx === stepIdx;
        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={cn('h-0.5 w-3 sm:w-5', done ? 'bg-primary' : 'bg-muted')} />
            )}
            <div className="flex flex-col items-center">
              {done ? (
                <CheckCircle className={cn('h-4 w-4', active ? 'text-primary' : 'text-primary/70')} />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
              <span className={cn('text-[10px] mt-0.5 leading-none', done ? 'text-foreground' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

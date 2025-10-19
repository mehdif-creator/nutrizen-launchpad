import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  bg?: string;
}

export function StatCard({ label, value, sub, icon, bg = "bg-card" }: StatCardProps) {
  return (
    <div className={`rounded-2xl shadow-card border border-border p-4 ${bg} hover:shadow-lg transition-all`}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold text-foreground truncate">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

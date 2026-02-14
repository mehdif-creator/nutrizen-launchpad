import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  colorClass?: string;
}

const AutomationStatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, colorClass = "bg-white" }) => {
  return (
    <div className={`p-6 rounded-xl shadow-sm border border-slate-100 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${colorClass === 'bg-white' ? 'bg-emerald-50' : 'bg-white/20'}`}>
          <Icon className={`w-6 h-6 ${colorClass === 'bg-white' ? 'text-emerald-600' : 'text-white'}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={trendUp ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>{trend}</span>
          <span className={`ml-2 ${colorClass === 'bg-white' ? 'text-slate-400' : 'text-slate-100/80'}`}>vs mois dernier</span>
        </div>
      )}
    </div>
  );
};

export default AutomationStatCard;

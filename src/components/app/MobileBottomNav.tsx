import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, ShoppingCart, Sparkles, User } from 'lucide-react';

const tabs = [
  { icon: LayoutDashboard, label: 'Accueil', to: '/app/dashboard', id: 'home' },
  { icon: CalendarDays, label: 'Semaine', to: '#semaine', id: 'week' },
  { icon: ShoppingCart, label: 'Courses', to: '/app/shopping-list', id: 'shopping' },
  { icon: Sparkles, label: 'InspiFrigo', to: '/app/inspi-frigo', id: 'inspi' },
  { icon: User, label: 'Profil', to: '/app/profile', id: 'profile' },
] as const;

export function MobileBottomNav() {
  const location = useLocation();
  const isDashboard =
    location.pathname === '/app' ||
    location.pathname === '/app/dashboard' ||
    location.pathname === '/tableau-de-bord';

  // Only render on dashboard
  if (!isDashboard) return null;

  const handleClick = (tab: typeof tabs[number], e: React.MouseEvent) => {
    if (tab.id === 'week') {
      e.preventDefault();
      document.getElementById('week-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isActive = (tab: typeof tabs[number]) => {
    if (tab.id === 'home') return isDashboard;
    if (tab.to.startsWith('#')) return false;
    return location.pathname === tab.to;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              to={tab.to}
              onClick={(e) => handleClick(tab, e)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            >
              <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span
                className={`text-[10px] leading-tight ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

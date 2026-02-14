import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Settings, ChefHat, Bell, Search, User, ShieldCheck, Map as MapIcon, ArrowLeft } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const BASE = '/admin/automation';

const AutomationLayout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Tableau de bord', href: `${BASE}`, icon: LayoutDashboard },
    { name: "File d'attente", href: `${BASE}/queue`, icon: List },
    { name: 'Recettes', href: `${BASE}/recipes`, icon: ChefHat },
    { name: 'Mapping Tableaux', href: `${BASE}/boards`, icon: MapIcon },
    { name: 'Paramètres', href: `${BASE}/settings`, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center justify-center h-16 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <ChefHat className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">Nutri<span className="text-emerald-600">Zen</span></span>
          </div>
        </div>

        <div className="p-4">
          <Link
            to="/admin"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour Admin
          </Link>
        </div>

        <nav className="px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Admin</p>
              <p className="text-xs text-slate-500">Automation</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100"
          >
            <List className="w-6 h-6" />
          </button>

          <div className="flex-1 max-w-lg ml-4 hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Rechercher recettes, tableaux, pins..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full text-slate-400 hover:text-slate-500 hover:bg-slate-100 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <ShieldCheck className="w-3 h-3" />
              Automation
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
};

export default AutomationLayout;

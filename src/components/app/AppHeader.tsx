import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, BookOpen, User, Settings, HelpCircle, LogOut, Shield, Camera, Menu, X, Moon, Sun, Globe } from "lucide-react";
import { GamificationHeader } from "./GamificationHeader";

export const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const languages = [
    { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
    { code: 'en' as const, label: 'English', flag: '🇬🇧' },
    { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
    { code: 'de' as const, label: 'Deutsch', flag: '🇩🇪' },
  ];

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActivePath = (path: string) => {
    if (path === "/app") {
      return location.pathname === "/app" || location.pathname === "/app/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/app" className="flex items-center hover:opacity-80 transition-opacity">
            <img
              src={new URL("@/assets/nutrizen-main-logo.png", import.meta.url).href}
              alt="NutriZen"
              className="h-14 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/app"
              className={`text-sm font-medium transition-colors ${
                isActivePath("/app") ? "text-[#00B37E] font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home className="inline h-4 w-4 mr-1" />
              Tableau de bord
            </Link>
            <Link
              to="/app/meal-plan"
              className={`text-sm font-medium transition-colors ${
                isActivePath("/app/meal-plan")
                  ? "text-[#00B37E] font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="inline h-4 w-4 mr-1" />
              Recettes
            </Link>
            <Link
              to="/app/scan-repas"
              className={`text-sm font-medium transition-colors ${
                isActivePath("/app/scan-repas")
                  ? "text-[#00B37E] font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Camera className="inline h-4 w-4 mr-1" />
              ScanRepas
            </Link>
            <Link
              to="/app/inspi-frigo"
              className={`text-sm font-medium transition-colors ${
                isActivePath("/app/inspi-frigo")
                  ? "text-[#00B37E] font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Camera className="inline h-4 w-4 mr-1" />
              InspiFrigo
            </Link>
            <Link
              to="/app/profile"
              className={`text-sm font-medium transition-colors ${
                isActivePath("/app/profile")
                  ? "text-[#00B37E] font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="inline h-4 w-4 mr-1" />
              Profil
            </Link>
            <Link
              to="/app/settings"
              className={`text-sm font-medium transition-colors ${
                isActivePath("/app/settings")
                  ? "text-[#00B37E] font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="inline h-4 w-4 mr-1" />
              Paramètres
            </Link>
            <Link
              to="/app/support"
              className={`text-sm font-medium transition-colors ${
                isActivePath("/app/support")
                  ? "text-[#00B37E] font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="inline h-4 w-4 mr-1" />
              Support
            </Link>
            <Link
              to="/blog"
              className={`text-sm font-medium transition-colors ${
                isActivePath("/blog") ? "text-[#00B37E] font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Blog
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <GamificationHeader />
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-1">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs">{languages.find(l => l.code === language)?.flag}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-white">
                    {getInitials(user?.user_metadata?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background z-50" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.user_metadata?.full_name && <p className="font-medium">{user.user_metadata.full_name}</p>}
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app">
                  <Home className="mr-2 h-4 w-4" />
                  Tableau de bord
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/app/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/app/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      Administration
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-4">
            {/* Gamification in mobile */}
            <div className="pb-3 border-b">
              <GamificationHeader />
            </div>
            
            {/* Theme and Language controls in mobile */}
            <div className="flex items-center gap-2 pb-3 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="flex-1"
              >
                {theme === 'light' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                {theme === 'light' ? 'Mode sombre' : 'Mode clair'}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <Globe className="h-4 w-4" />
                    <span>{languages.find(l => l.code === language)?.flag}</span>
                    <span className="text-xs">{languages.find(l => l.code === language)?.label}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={language === lang.code ? 'bg-accent' : ''}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <Link
              to="/app"
              className={`text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                isActivePath("/app") ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="h-4 w-4" />
              Tableau de bord
            </Link>
            <Link
              to="/app/meal-plan"
              className={`text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                isActivePath("/app/meal-plan") ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <BookOpen className="h-4 w-4" />
              Recettes
            </Link>
            <Link
              to="/app/scan-repas"
              className={`text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                isActivePath("/app/scan-repas") ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Camera className="h-4 w-4" />
              ScanRepas
            </Link>
            <Link
              to="/app/inspi-frigo"
              className={`text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                isActivePath("/app/inspi-frigo") ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Camera className="h-4 w-4" />
              InspiFrigo
            </Link>
            <Link
              to="/app/profile"
              className={`text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                isActivePath("/app/profile") ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="h-4 w-4" />
              Profil
            </Link>
            <Link
              to="/app/settings"
              className={`text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                isActivePath("/app/settings") ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Paramètres
            </Link>
            <Link
              to="/app/support"
              className={`text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                isActivePath("/app/support") ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <HelpCircle className="h-4 w-4" />
              Support
            </Link>
            <Link
              to="/blog"
              className={`text-left text-sm font-medium transition-colors ${
                isActivePath("/blog") ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

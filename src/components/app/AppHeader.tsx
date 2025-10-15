import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Home, BookOpen, User, Settings, HelpCircle, LogOut, Shield } from 'lucide-react';

export const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/app" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <span className="text-lg font-bold text-white">N</span>
            </div>
            <span className="text-xl font-bold">NutriZen</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/app"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="inline h-4 w-4 mr-1" />
              Tableau de bord
            </Link>
            <Link
              to="/app/mealplan"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="inline h-4 w-4 mr-1" />
              Recettes
            </Link>
            <Link
              to="/app/profile"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="inline h-4 w-4 mr-1" />
              Profil
            </Link>
            <Link
              to="/app/settings"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="inline h-4 w-4 mr-1" />
              Paramètres
            </Link>
            <Link
              to="/app/support"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="inline h-4 w-4 mr-1" />
              Support
            </Link>
            <Link
              to="/blog"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Blog
            </Link>
          </nav>
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
          <DropdownMenuContent className="w-56" align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {user?.user_metadata?.full_name && (
                  <p className="font-medium">{user.user_metadata.full_name}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
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
      </div>
    </header>
  );
};

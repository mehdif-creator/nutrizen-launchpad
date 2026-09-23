import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const PreHeader = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const languages = [
    { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
    { code: 'en' as const, label: 'English', flag: '🇬🇧' },
    { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
    { code: 'de' as const, label: 'Deutsch', flag: '🇩🇪' },
  ];

  return (
    <div className="w-full bg-gradient-to-r from-primary to-accent text-white">
      <div className="container flex h-14 items-center justify-between px-3.5 text-sm md:h-auto md:py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold leading-[1.25] md:hidden">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Satisfait ou remboursé 30 jours
          </span>
          <span className="hidden font-semibold md:inline">{t('preheader.trial')}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 md:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-11 w-11 p-0 text-white hover:bg-white/20 md:h-8 md:w-8"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-11 min-w-11 gap-1 px-2 text-white hover:bg-white/20 md:h-8">
                <Globe className="h-4 w-4" />
                <span className="text-xs">{languages.find((l) => l.code === language)?.flag}</span>
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
      </div>
    </div>
  );
};

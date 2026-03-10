import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderProps {
  onCtaClick: () => void;
}

export const Header = ({ onCtaClick }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center hover:opacity-80 transition-tech">
          <img 
            src={new URL('@/assets/nutrizen-main-logo.png', import.meta.url).href}
            alt="NutriZen Logo" 
            className="h-10 md:h-14 w-auto max-w-[120px]"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => scrollToSection('avantages')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            {t('header.advantages')}
          </button>
          <button
            onClick={() => scrollToSection('comment')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            {t('header.howItWorks')}
          </button>
          <button
            onClick={() => scrollToSection('exemples')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            {t('header.examples')}
          </button>
          <button
            onClick={() => scrollToSection('tarifs')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            {t('header.pricing')}
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            {t('header.faq')}
          </button>
          <Link
            to="/blog"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            {t('header.blog')}
          </Link>
          <Link
            to="/auth/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            {t('header.login')}
          </Link>
        </nav>

        {/* CTA Button - Desktop */}
        <div className="hidden md:block">
          <Button
            onClick={onCtaClick}
            size="sm"
            className="bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] transition-tech shadow-glow"
          >
            Commencer gratuitement
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-3 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu - full screen overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background overflow-y-auto">
          <nav className="container py-6 flex flex-col gap-1">
            {[
              { action: () => scrollToSection('avantages'), label: t('header.advantages') },
              { action: () => scrollToSection('comment'), label: t('header.howItWorks') },
              { action: () => scrollToSection('exemples'), label: t('header.examples') },
              { action: () => scrollToSection('tarifs'), label: t('header.pricing') },
              { action: () => scrollToSection('faq'), label: t('header.faq') },
            ].map(({ action, label }) => (
              <button
                key={label}
                onClick={action}
                className="text-left text-base font-medium text-muted-foreground hover:text-foreground py-3 px-2 min-h-[48px] flex items-center border-b border-border/50"
              >
                {label}
              </button>
            ))}
            <Link
              to="/blog"
              className="text-left text-base font-medium text-muted-foreground hover:text-foreground py-3 px-2 min-h-[48px] flex items-center border-b border-border/50"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('header.blog')}
            </Link>
            <Link
              to="/auth/login"
              className="text-left text-base font-medium text-muted-foreground hover:text-foreground py-3 px-2 min-h-[48px] flex items-center border-b border-border/50"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('header.login')}
            </Link>
            <Button
              onClick={onCtaClick}
              className="w-full bg-gradient-to-r from-primary to-accent text-white mt-4 min-h-[52px] text-base"
            >
              Commencer gratuitement
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

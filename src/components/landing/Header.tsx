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
            className="h-14 w-auto"
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
          className="md:hidden p-2"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-4">
            <button
              onClick={() => scrollToSection('avantages')}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('header.advantages')}
            </button>
            <button
              onClick={() => scrollToSection('comment')}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('header.howItWorks')}
            </button>
            <button
              onClick={() => scrollToSection('exemples')}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('header.examples')}
            </button>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('header.pricing')}
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('header.faq')}
            </button>
            <Link
              to="/blog"
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('header.blog')}
            </Link>
            <Link
              to="/auth/login"
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('header.login')}
            </Link>
            <Button
              onClick={onCtaClick}
              className="w-full bg-gradient-to-r from-primary to-accent text-white"
            >
              Commencer gratuitement
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

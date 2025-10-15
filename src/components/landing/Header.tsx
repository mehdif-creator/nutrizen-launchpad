import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onCtaClick: () => void;
}

export const Header = ({ onCtaClick }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <span className="text-lg font-bold text-white">N</span>
          </div>
          <span className="text-xl font-bold">NutriZen</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => scrollToSection('avantages')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            Avantages
          </button>
          <button
            onClick={() => scrollToSection('comment')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            Fonctionnement
          </button>
          <button
            onClick={() => scrollToSection('exemples')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            Exemples
          </button>
          <button
            onClick={() => scrollToSection('tarifs')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            Tarifs
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-tech"
          >
            FAQ
          </button>
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
              Avantages
            </button>
            <button
              onClick={() => scrollToSection('comment')}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Fonctionnement
            </button>
            <button
              onClick={() => scrollToSection('exemples')}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Exemples
            </button>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Tarifs
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              FAQ
            </button>
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

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { PersonaKey } from '@/config/personas';

interface HeaderProps {
  currentPersona: PersonaKey;
  onPersonaChange: (persona: PersonaKey) => void;
  onCtaClick: () => void;
}

export const Header = ({ currentPersona, onPersonaChange, onCtaClick }: HeaderProps) => {
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
            Comment ça marche
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

        {/* Persona Pills - Desktop */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => onPersonaChange('thomas')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-tech ${
              currentPersona === 'thomas'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Thomas
          </button>
          <button
            onClick={() => onPersonaChange('sarah')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-tech ${
              currentPersona === 'sarah'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Sarah
          </button>
          <button
            onClick={() => onPersonaChange('kevin')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-tech ${
              currentPersona === 'kevin'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Kevin
          </button>
        </div>

        {/* CTA Button - Desktop */}
        <div className="hidden md:block">
          <Button
            onClick={onCtaClick}
            size="sm"
            className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 glow-primary"
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
              Comment ça marche
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
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Profils</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onPersonaChange('thomas')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-tech ${
                    currentPersona === 'thomas'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  Thomas
                </button>
                <button
                  onClick={() => onPersonaChange('sarah')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-tech ${
                    currentPersona === 'sarah'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  Sarah
                </button>
                <button
                  onClick={() => onPersonaChange('kevin')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-tech ${
                    currentPersona === 'kevin'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  Kevin
                </button>
              </div>
            </div>
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

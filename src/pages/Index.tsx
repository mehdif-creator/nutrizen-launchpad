import { useState, useEffect } from 'react';
import { PreHeader } from '@/components/landing/PreHeader';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { TrustRow } from '@/components/landing/TrustRow';
import { PersonaCards } from '@/components/landing/PersonaCards';
import { PASSection } from '@/components/landing/PASSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';
import { personaConfig, getPersonaFromUrl, PersonaKey } from '@/config/personas';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [currentPersona, setCurrentPersona] = useState<PersonaKey>(getPersonaFromUrl());
  const { toast } = useToast();

  useEffect(() => {
    // Update URL when persona changes
    const params = new URLSearchParams(window.location.search);
    if (currentPersona !== 'default') {
      params.set('persona', currentPersona);
    } else {
      params.delete('persona');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [currentPersona]);

  const handlePersonaChange = (persona: PersonaKey) => {
    setCurrentPersona(persona);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCtaClick = () => {
    // For now, show a toast. Later this will open sign-up modal
    toast({
      title: '🎉 Bienvenue sur NutriZen !',
      description: 'L\'inscription sera disponible très bientôt. Reste connecté(e) !',
    });
  };

  const handleExampleClick = () => {
    // For now, scroll to examples section
    const element = document.getElementById('exemples');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const config = personaConfig[currentPersona];

  return (
    <div className="min-h-screen">
      <PreHeader />
      <Header
        currentPersona={currentPersona}
        onPersonaChange={handlePersonaChange}
        onCtaClick={handleCtaClick}
      />
      <Hero
        config={config}
        onCtaClick={handleCtaClick}
        onExampleClick={handleExampleClick}
      />
      <TrustRow />
      <PersonaCards onPersonaChange={handlePersonaChange} />
      <PASSection config={config} />
      <HowItWorks />
      <div id="exemples" className="py-16 bg-muted/30">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Exemples de menus</h2>
          <p className="text-muted-foreground mb-8">Section à venir — aperçu des plans hebdo</p>
          <div className="max-w-2xl mx-auto p-8 bg-background rounded-lg border">
            <p className="text-sm text-muted-foreground">
              {config.exampleWeekHints.join(' • ')}
            </p>
          </div>
        </div>
      </div>
      <Pricing onCtaClick={handleCtaClick} pricingNote={config.pricingNote} />
      <FAQ />
      <Footer />
    </div>
  );
};

export default Index;

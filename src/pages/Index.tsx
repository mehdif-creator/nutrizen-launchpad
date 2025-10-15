import { useState, useEffect } from 'react';
import { PreHeader } from '@/components/landing/PreHeader';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { TrustRow } from '@/components/landing/TrustRow';
import { PersonaCards } from '@/components/landing/PersonaCards';
import { PASSection } from '@/components/landing/PASSection';
import { Testimonials } from '@/components/landing/Testimonials';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { ExampleWeek } from '@/components/landing/ExampleWeek';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { LeadMagnet } from '@/components/landing/LeadMagnet';
import { Footer } from '@/components/landing/Footer';
import { CookieBanner } from '@/components/landing/CookieBanner';
import { MobileStickyCTA } from '@/components/landing/MobileStickyCTA';
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
    // Scroll to examples section
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
      <Testimonials config={config} />
      <HowItWorks />
      <ExampleWeek />
      <Pricing onCtaClick={handleCtaClick} pricingNote={config.pricingNote} />
      <FAQ />
      <LeadMagnet />
      <Footer />
      <CookieBanner />
      <MobileStickyCTA onCtaClick={handleCtaClick} />
    </div>
  );
};

export default Index;

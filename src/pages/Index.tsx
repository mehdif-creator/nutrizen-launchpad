import { PreHeader } from '@/components/landing/PreHeader';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { TrustRow } from '@/components/landing/TrustRow';
import { Benefits } from '@/components/landing/Benefits';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { ExampleWeek } from '@/components/landing/ExampleWeek';
import { Testimonials } from '@/components/landing/Testimonials';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { LeadMagnet } from '@/components/landing/LeadMagnet';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';
import { MobileStickyCTA } from '@/components/landing/MobileStickyCTA';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { toast } = useToast();

  const handleCtaClick = () => {
    toast({
      title: '🎉 Bienvenue sur NutriZen !',
      description: 'L\'inscription sera disponible très bientôt. Reste connecté(e) !',
    });
  };

  const handleExampleClick = () => {
    const element = document.getElementById('exemples');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      <PreHeader />
      <Header onCtaClick={handleCtaClick} />
      <Hero onCtaClick={handleCtaClick} onExampleClick={handleExampleClick} />
      <TrustRow />
      <Benefits />
      <HowItWorks />
      <ExampleWeek />
      <Testimonials />
      <Pricing onCtaClick={handleCtaClick} />
      <FAQ />
      <LeadMagnet />
      <FinalCTA onCtaClick={handleCtaClick} />
      <Footer />
      <MobileStickyCTA onCtaClick={handleCtaClick} />
    </div>
  );
};

export default Index;

import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { PreHeader } from '@/components/landing/PreHeader';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { MadeForYou } from '@/components/landing/MadeForYou';
import { Benefits } from '@/components/landing/Benefits';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { RecipeGallery } from '@/components/landing/RecipeGallery';
import { ValueStackSection } from '@/components/landing/ValueStackSection';

import { Guarantee } from '@/components/landing/Guarantee';
import { GuaranteeCard } from '@/components/landing/GuaranteeCard';
import { CommunityTestimonials } from '@/components/landing/CommunityTestimonials';
import { ExampleWeek } from '@/components/landing/ExampleWeek';
import { Pricing } from '@/components/landing/Pricing';
import { EconomicComparison } from '@/components/landing/EconomicComparison';
import { FAQ } from '@/components/landing/FAQ';
import { ProfileQuiz } from '@/components/landing/ProfileQuiz';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';
import { MobileStickyCTA } from '@/components/landing/MobileStickyCTA';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { useNavigate } from 'react-router-dom';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { mainCopy } from '@/config/marketingCopy';

const homeValueItems = [
  {
    feature: 'Menus personnalisés 7j/7',
    description: 'Adaptés à vos goûts, régimes alimentaires et composition du foyer',
    value: 'valeur : ~80€/mois chez un diététicien',
  },
  {
    feature: 'Liste de courses intelligente',
    description: 'Générée automatiquement, groupée par rayon, anti-gaspillage',
    value: 'valeur : ~20€/mois de gaspillage évité',
  },
  {
    feature: 'Suivi nutritionnel automatique',
    description: 'Calories, protéines, glucides, lipides — sans calcul de votre part',
    value: 'valeur : ~40€/mois (app nutrition premium)',
  },
  {
    feature: '+500 recettes accessibles',
    description: 'Simples, rapides, testées par de vrais utilisateurs',
    value: 'valeur : ~15€/mois (livre de recettes)',
  },
  {
    feature: 'Nouveaux menus chaque semaine',
    description: 'Vous ne mangez jamais deux fois la même semaine',
    value: 'inclus',
  },
];

const Index = () => {
  const navigate = useNavigate();
  useReferralTracking();
  useSeoMeta(mainCopy.seo.title, mainCopy.seo.description);

  const handleCtaClick = () => {
    navigate('/auth/signup');
  };

  const handleExampleClick = () => {
    const element = document.getElementById('exemples');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      <AnnouncementBar />
      <PreHeader />
      <Header onCtaClick={handleCtaClick} />
      <Hero onCtaClick={handleCtaClick} onExampleClick={handleExampleClick} copy={mainCopy.hero} />
      <MadeForYou />
      <Benefits copy={mainCopy.benefits} />
      <ProfileQuiz />
      <HowItWorks copy={mainCopy.howItWorks} />
      <ValueStackSection items={homeValueItems} totalValue="~250€/mois" price="12,99€/mois" />

      <Guarantee />
      <RecipeGallery />
      <CommunityTestimonials />
      <ExampleWeek />
      <GuaranteeCard />
      <Pricing onCtaClick={handleCtaClick} />
      <EconomicComparison />
      <FAQ copy={mainCopy.faq} />
      <FinalCTA onCtaClick={handleCtaClick} copy={mainCopy.finalCta} />
      <Footer />
      <MobileStickyCTA onCtaClick={handleCtaClick} />
      <ScrollToTop />
    </div>
  );
};

export default Index;

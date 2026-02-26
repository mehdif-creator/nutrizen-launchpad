import { PreHeader } from '@/components/landing/PreHeader';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { Benefits } from '@/components/landing/Benefits';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { RecipeGallery } from '@/components/landing/RecipeGallery';

import { Guarantee } from '@/components/landing/Guarantee';
import { CommunityTestimonials } from '@/components/landing/CommunityTestimonials';
import { ExampleWeek } from '@/components/landing/ExampleWeek';
import { Pricing } from '@/components/landing/Pricing';
import { EconomicComparison } from '@/components/landing/EconomicComparison';
import { FAQ } from '@/components/landing/FAQ';
import { LeadMagnet } from '@/components/landing/LeadMagnet';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';
import { MobileStickyCTA } from '@/components/landing/MobileStickyCTA';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { useNavigate } from 'react-router-dom';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { mumCopy } from '@/config/marketingCopy';

const Mum = () => {
  const navigate = useNavigate();
  useReferralTracking();
  useSeoMeta(mumCopy.seo.title, mumCopy.seo.description);

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
      <PreHeader />
      <Header onCtaClick={handleCtaClick} />
      <Hero onCtaClick={handleCtaClick} onExampleClick={handleExampleClick} copy={mumCopy.hero} />
      <Benefits copy={mumCopy.benefits} />
      <HowItWorks copy={mumCopy.howItWorks} />
      
      <Guarantee />
      <RecipeGallery />
      <CommunityTestimonials />
      <ExampleWeek />
      <Pricing onCtaClick={handleCtaClick} />
      <EconomicComparison />
      <FAQ copy={mumCopy.faq} />
      <LeadMagnet copy={mumCopy.leadMagnet} />
      <FinalCTA onCtaClick={handleCtaClick} copy={mumCopy.finalCta} />
      <Footer />
      <MobileStickyCTA onCtaClick={handleCtaClick} />
      <ScrollToTop />
    </div>
  );
};

export default Mum;

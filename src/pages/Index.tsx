import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { mainCopy } from '@/config/marketingCopy';

// Eager: above the fold
import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { PreHeader } from '@/components/landing/PreHeader';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { MadeForYou } from '@/components/landing/MadeForYou';
import { Benefits } from '@/components/landing/Benefits';

// Lazy: below the fold
const ProfileQuiz = lazy(() => import('@/components/landing/ProfileQuiz').then(m => ({ default: m.ProfileQuiz })));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks').then(m => ({ default: m.HowItWorks })));
const ValueStackSection = lazy(() => import('@/components/landing/ValueStackSection').then(m => ({ default: m.ValueStackSection })));
const Guarantee = lazy(() => import('@/components/landing/Guarantee').then(m => ({ default: m.Guarantee })));
const GuaranteeCard = lazy(() => import('@/components/landing/GuaranteeCard').then(m => ({ default: m.GuaranteeCard })));
const RecipeGallery = lazy(() => import('@/components/landing/RecipeGallery').then(m => ({ default: m.RecipeGallery })));
const CommunityTestimonials = lazy(() => import('@/components/landing/CommunityTestimonials').then(m => ({ default: m.CommunityTestimonials })));
const ExampleWeek = lazy(() => import('@/components/landing/ExampleWeek').then(m => ({ default: m.ExampleWeek })));
const Pricing = lazy(() => import('@/components/landing/Pricing').then(m => ({ default: m.Pricing })));
const FAQ = lazy(() => import('@/components/landing/FAQ').then(m => ({ default: m.FAQ })));
const FinalCTA = lazy(() => import('@/components/landing/FinalCTA').then(m => ({ default: m.FinalCTA })));
const Footer = lazy(() => import('@/components/landing/Footer').then(m => ({ default: m.Footer })));
const MobileStickyCTA = lazy(() => import('@/components/landing/MobileStickyCTA').then(m => ({ default: m.MobileStickyCTA })));
const ScrollToTop = lazy(() => import('@/components/common/ScrollToTop').then(m => ({ default: m.ScrollToTop })));
const LeadMagnetForm = lazy(() => import('@/components/landing/LeadMagnetForm').then(m => ({ default: m.LeadMagnetForm })));

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
  {
    feature: 'Scan code-barres intelligent',
    description: 'Scannez un produit en supermarché et obtenez instantanément son analyse nutritionnelle',
    value: 'valeur : ~10€/mois (app nutrition)',
  },
  {
    feature: 'Analyse photo de repas par IA',
    description: 'Prenez votre assiette en photo — calories, macros et conseils en quelques secondes',
    value: 'valeur : ~15€/mois (coach nutrition)',
  },
  {
    feature: 'Inspi Frigo — recettes depuis vos ingrédients',
    description: 'Photographiez votre frigo, notre IA vous propose des recettes avec ce que vous avez',
    value: 'valeur : ~20€/mois (anti-gaspillage)',
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

      <Suspense fallback={<div className="py-16" />}>
        <ProfileQuiz />
        <HowItWorks copy={mainCopy.howItWorks} />
        <ValueStackSection items={homeValueItems} totalValue="~250€/mois" price="12,99€/mois" />
        <Guarantee />
        <RecipeGallery />
        <CommunityTestimonials />
        <ExampleWeek />
        <GuaranteeCard />
        <Pricing onCtaClick={handleCtaClick} />
        <FAQ copy={mainCopy.faq} />
        <LeadMagnetForm
          listId={5}
          title="Défi Healthy 7 Jours"
          text="Recevez votre programme gratuit pour transformer vos repas en 7 jours."
          buttonLabel="Recevoir mon Défi Gratuit →"
          successMessage="C'est parti ! Votre défi arrive dans votre boîte mail 🎉"
          source="landing_home_lead_magnet"
        />
        <FinalCTA onCtaClick={handleCtaClick} copy={mainCopy.finalCta} />
        <Footer />
        <MobileStickyCTA onCtaClick={handleCtaClick} />
        <ScrollToTop />
      </Suspense>
    </div>
  );
};

export default Index;

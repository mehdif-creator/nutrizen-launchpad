import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { PreHeader } from '@/components/landing/PreHeader';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { FitMadeForYou } from '@/components/landing/FitMadeForYou';
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
import { LeadMagnet } from '@/components/landing/LeadMagnet';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';
import { MobileStickyCTA } from '@/components/landing/MobileStickyCTA';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { useNavigate } from 'react-router-dom';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { fitCopy } from '@/config/marketingCopy';

const fitValueItems = [
  {
    feature: 'Calcul TDEE + macros personnalisées',
    description: "Basé sur votre objectif, poids, taille, âge et niveau d'activité réel",
    value: 'valeur : ~60€/consultation coach sportif',
  },
  {
    feature: 'Menus optimisés protéines',
    description: 'Votre cible protéique atteinte chaque jour, automatiquement',
    value: 'valeur : ~80€/mois (plan nutritionnel coach)',
  },
  {
    feature: 'Plan meal prep hebdomadaire',
    description: 'Cuisinez le dimanche en 1h — mangez bien les 7 jours suivants',
    value: 'valeur : ~30€/mois',
  },
  {
    feature: 'Ajustements progressifs automatiques',
    description: 'Vos macros évoluent avec vous semaine après semaine',
    value: 'valeur : ~40€/mois (suivi nutritionnel)',
  },
  {
    feature: 'Compatible tous sports et tous niveaux',
    description: 'Musculation, crossfit, running, cyclisme, sports collectifs',
    value: 'inclus',
  },
];

const fitTestimonials = [
  {
    name: 'Thomas, 31 ans, Bordeaux — Développeur, musculation 4x/semaine',
    quote: "Je comptais mes macros sur MyFitnessPal depuis 2 ans. Ça me prenait 25 minutes par jour. Depuis NutriZen Fit, je mets 5 minutes le dimanche. J'ai pris 3kg de muscle en 3 mois sans changer mon entraînement.",
    rating: 5,
  },
  {
    name: 'Alexis, 28 ans, Lyon — Commercial, crossfit 3x/semaine',
    quote: "Je séchais depuis 8 semaines sans résultats visibles. Le problème c'était mes repas du soir trop glucidiques. NutriZen a restructuré ma journée alimentaire en 3 minutes. -5kg en 6 semaines.",
    rating: 5,
  },
  {
    name: 'Laure, 34 ans, Rennes — Kinésithérapeute, running 5x/semaine',
    quote: "En tant que coureuse je n'avais pas de plan nutrition adapté à mes séances. NutriZen Fit ajuste mes apports les jours de sortie longue automatiquement. Mon énergie sur les sorties de plus de 15km s'est vraiment améliorée.",
    rating: 5,
  },
  {
    name: 'Maxime, 26 ans, Nantes — Étudiant, musculation 5x/semaine',
    quote: "En prise de masse j'avais du mal à atteindre 180g de protéines par jour sans manger n'importe quoi. Les menus NutriZen Fit y arrivent avec des recettes que j'ai réellement envie de cuisiner.",
    rating: 5,
  },
  {
    name: 'Clara, 30 ans, Marseille — Chef de projet, cyclisme 4x/semaine',
    quote: "Mes sorties vélo de 3h demandent beaucoup d'énergie. Depuis que NutriZen adapte mes glucides les jours de sortie, j'ai gagné en récupération et perdu 2kg de gras en 2 mois.",
    rating: 5,
  },
  {
    name: 'Romain, 37 ans, Lille — Ingénieur, crossfit 4x/semaine',
    quote: "Je dépensais 90€/mois chez un coach nutrition pour un plan figé. NutriZen me donne un plan qui évolue chaque semaine pour 12,99€. Même résultats, 7x moins cher.",
    rating: 5,
  },
];

const Fit = () => {
  const navigate = useNavigate();
  useReferralTracking();
  useSeoMeta(fitCopy.seo.title, fitCopy.seo.description);

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
      <Hero onCtaClick={handleCtaClick} onExampleClick={handleExampleClick} copy={fitCopy.hero} />
      <FitMadeForYou />
      <Benefits copy={fitCopy.benefits} />
      <HowItWorks copy={fitCopy.howItWorks} />
      <ValueStackSection items={fitValueItems} totalValue="~250€/mois" price="12,99€/mois" />

      <Guarantee />
      <RecipeGallery />
      <CommunityTestimonials testimonials={fitTestimonials} />
      <ExampleWeek />
      <GuaranteeCard />
      <Pricing onCtaClick={handleCtaClick} />
      <EconomicComparison />
      <FAQ copy={fitCopy.faq} />
      <LeadMagnet copy={fitCopy.leadMagnet} />
      <FinalCTA onCtaClick={handleCtaClick} copy={fitCopy.finalCta} />
      <Footer />
      <MobileStickyCTA onCtaClick={handleCtaClick} />
      <ScrollToTop />
    </div>
  );
};

export default Fit;

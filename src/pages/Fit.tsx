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
import { FAQ } from '@/components/landing/FAQ';
import { LeadMagnetForm } from '@/components/landing/LeadMagnetForm';
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
  {
    feature: 'Scan code-barres nutritionnel',
    description: 'Vérifiez en 2 secondes si un produit colle à vos macros avant de l\'acheter',
    value: 'valeur : ~10€/mois (app nutrition)',
  },
  {
    feature: 'Analyse photo de repas par IA',
    description: 'Photographiez votre assiette — estimation précise des calories, protéines, glucides et lipides',
    value: 'valeur : ~15€/mois (coach nutrition)',
  },
  {
    feature: 'Inspi Frigo — recettes protéinées express',
    description: 'Photographiez vos ingrédients, l\'IA vous propose des recettes adaptées à votre objectif',
    value: 'valeur : ~20€/mois (anti-gaspillage)',
  },
];

const fitTestimonials = [
  {
    name: 'Thomas, 31 ans, Bordeaux',
    profession: 'Développeur — Musculation 4x/semaine',
    quote: "Je comptais mes macros sur MyFitnessPal depuis 2 ans — 25 minutes par jour. Depuis NutriZen Fit, 5 minutes le dimanche. J'ai pris 3kg de muscle en 3 mois sans changer mon entraînement.",
    rating: 5,
  },
  {
    name: 'Alexis, 28 ans, Lyon',
    profession: 'Commercial — Crossfit 3x/semaine',
    quote: "Je séchais depuis 8 semaines sans résultats. Le problème c'était mes repas du soir trop glucidiques. NutriZen a restructuré ma journée en 3 minutes. -5kg en 6 semaines.",
    rating: 5,
  },
  {
    name: 'Laure, 34 ans, Rennes',
    profession: 'Kinésithérapeute — Running 5x/semaine',
    quote: "En tant que coureuse, mes apports n'étaient pas adaptés à mes séances. NutriZen ajuste mes macros automatiquement les jours de sortie longue. Mon énergie sur 15km+ s'est transformée.",
    rating: 5,
  },
  {
    name: 'Mehdi, 26 ans, Marseille',
    profession: "Étudiant en école d'ingénieur — Crossfit 5x/semaine",
    quote: "Je mangeais pareil depuis 2 ans : riz, poulet, œufs. Efficace mais invivable. NutriZen Fit m'a donné 60+ recettes hautes en protéines que j'attendais sans le savoir.",
    rating: 5,
  },
  {
    name: 'Sébastien, 37 ans, Paris',
    profession: 'Consultant — Musculation 3x/semaine',
    quote: "Le meal prep que je faisais prenait 3h le dimanche parce que je n'avais pas de plan. Avec NutriZen, 1h15 chrono, tout préparé pour la semaine.",
    rating: 5,
  },
  {
    name: 'Antoine, 30 ans, Lille',
    profession: 'Professeur de sport — Musculation 5x/semaine',
    quote: "Je voulais prendre de la masse sans prendre trop de gras. En 10 semaines avec NutriZen Fit : +4kg sur la balance, -1.5% de masse grasse mesurée. Le ratio dont je rêvais.",
    rating: 5,
  },
];

const fitComparison = {
  without: [
    "~30 min/jour à calculer vos macros",
    "Résultats qui stagnent",
    "Mêmes 4 repas en boucle",
  ],
  with: [
    "5 min le dimanche",
    "Macros toujours alignées avec votre objectif",
    "+60 recettes hautes en protéines",
  ],
};

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
      <ValueStackSection items={fitValueItems} totalValue="~295€/mois" price="12,99€/mois" />
      <Guarantee />
      <RecipeGallery />
      <CommunityTestimonials testimonials={fitTestimonials} />
      <ExampleWeek />
      <GuaranteeCard />
      <Pricing onCtaClick={handleCtaClick} comparison={fitComparison} />
      <FAQ copy={fitCopy.faq} />
      <LeadMagnetForm
        listId={6}
        title="Programme 21 Jours en Forme"
        text="Un plan d'action concret pour transformer votre alimentation sportive en 3 semaines."
        buttonLabel="Télécharger mon Programme 21 Jours →"
        successMessage="Parfait ! Votre programme arrive dans votre boîte mail 💪"
        source="landing_fit_lead_magnet"
      />
      <FinalCTA onCtaClick={handleCtaClick} copy={fitCopy.finalCta} />
      <Footer />
      <MobileStickyCTA onCtaClick={handleCtaClick} />
      <ScrollToTop />
    </div>
  );
};

export default Fit;

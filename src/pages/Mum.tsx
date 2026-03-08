import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { PreHeader } from '@/components/landing/PreHeader';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { MumMadeForYou } from '@/components/landing/MumMadeForYou';
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
import { mumCopy } from '@/config/marketingCopy';

const mumValueItems = [
  {
    feature: 'Planification famille complète',
    description: "Jusqu'à 6 personnes avec préférences et restrictions individuelles",
    value: 'valeur : ~80€/mois (diététicien famille)',
  },
  {
    feature: 'Liste de courses anti-gaspillage',
    description: 'Budget optimisé, groupé par rayon — rien qui traîne au fond du frigo',
    value: 'économie moyenne : ~200€/mois en courses',
  },
  {
    feature: 'Recettes rapides validées familles',
    description: 'Réalisables en moins de 30 minutes avec des ingrédients courants',
    value: 'valeur : ~20€/mois (livre de recettes famille)',
  },
  {
    feature: 'Alternatives de dernière minute',
    description: 'Pour les soirs où le plan change — suggestions rapides en 1 clic',
    value: 'inclus',
  },
  {
    feature: 'Charge mentale réduite',
    description: 'Une décision par semaine au lieu de 21 — dimanche matin, 10 minutes',
    value: "n'a pas de prix",
  },
  {
    feature: 'Scan code-barres au supermarché',
    description: 'Vérifiez en un clic si un produit convient à toute la famille (allergies, préférences)',
    value: 'valeur : ~10€/mois (app nutrition)',
  },
  {
    feature: 'Analyse photo de repas par IA',
    description: 'Prenez le repas en photo — vérifiez que vos enfants mangent équilibré sans calculer',
    value: 'valeur : ~15€/mois (coach nutrition)',
  },
  {
    feature: 'Inspi Frigo — cuisinez avec ce qu\'il reste',
    description: 'Photographiez votre frigo, recevez des idées de repas famille avec les ingrédients disponibles',
    value: 'valeur : ~20€/mois (anti-gaspillage)',
  },
];

const mumTestimonials = [
  {
    name: 'Sophie, 38 ans, Nantes',
    profession: 'Assistante de direction — 2 enfants',
    quote: "Je faisais les courses sans liste et rentrais sans savoir quoi cuisiner. Maintenant je planifie en 10 minutes le dimanche. On jette deux fois moins et mes enfants mangent mieux.",
    rating: 5,
  },
  {
    name: 'Isabelle, 42 ans, Montpellier',
    profession: 'Infirmière — 3 enfants',
    quote: "Mon fils est intolérant au lactose, ma fille déteste les légumes verts. NutriZen gère les deux en même temps. C'est la première appli qui ne crée pas de problèmes supplémentaires.",
    rating: 5,
  },
  {
    name: 'Claire, 35 ans, Lille',
    profession: 'Comptable — 2 enfants',
    quote: "On dépensait 650€/mois en courses pour 4 personnes. En planifiant avec NutriZen, on est passé à 430€. 220€ d'économie par mois, sans rien supprimer.",
    rating: 5,
  },
  {
    name: 'Marie, 40 ans, Bordeaux',
    profession: 'Responsable RH — 2 enfants',
    quote: "La charge mentale autour des repas m'épuisait sans que je réalise à quel point. Depuis 6 semaines je ne pense plus aux dîners de la semaine. Ça paraît petit. C'est énorme.",
    rating: 5,
  },
  {
    name: 'Aurélie, 36 ans, Grenoble',
    profession: 'Architecte — 3 enfants',
    quote: "Mon mari et moi n'avons pas les mêmes goûts et les enfants encore moins. NutriZen propose des menus qui conviennent à tout le monde sans que je cuisine 3 versions.",
    rating: 5,
  },
  {
    name: 'Virginie, 43 ans, Strasbourg',
    profession: "Directrice d'école — 2 enfants",
    quote: "J'avais essayé de planifier seule avec un tableau Excel. J'abandonnais après 2 semaines à chaque fois. Avec NutriZen, je suis à 4 mois sans interruption.",
    rating: 5,
  },
];

const mumComparison = {
  without: [
    "La question « quoi ce soir ? » chaque jour",
    "~200€ gaspillés/mois",
    "Cuisiner 3 versions différentes",
  ],
  with: [
    "10 min le dimanche",
    "-200€/mois en courses",
    "Un menu, tout le monde content",
  ],
};

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
      <AnnouncementBar />
      <PreHeader />
      <Header onCtaClick={handleCtaClick} />
      <Hero onCtaClick={handleCtaClick} onExampleClick={handleExampleClick} copy={mumCopy.hero} />
      <MumMadeForYou />
      <Benefits copy={mumCopy.benefits} />
      <HowItWorks copy={mumCopy.howItWorks} />
      <ValueStackSection items={mumValueItems} totalValue="~295€/mois" price="12,99€/mois" />
      <Guarantee />
      <RecipeGallery />
      <CommunityTestimonials testimonials={mumTestimonials} />
      <ExampleWeek />
      <GuaranteeCard />
      <Pricing onCtaClick={handleCtaClick} comparison={mumComparison} />
      <FAQ copy={mumCopy.faq} />
      <LeadMagnetForm
        listId={7}
        title="Le Frigo Zen — Les 20 Essentiels"
        text="La checklist des 20 ingrédients à toujours avoir pour des repas sains sans stress."
        buttonLabel="Obtenir ma checklist Frigo Zen →"
        successMessage="Super ! Votre checklist Frigo Zen arrive dans votre boîte mail 🥗"
        source="landing_mum_lead_magnet"
      />
      <FinalCTA onCtaClick={handleCtaClick} copy={mumCopy.finalCta} />
      <Footer />
      <MobileStickyCTA onCtaClick={handleCtaClick} />
      <ScrollToTop />
    </div>
  );
};

export default Mum;

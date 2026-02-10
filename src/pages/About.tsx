import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Shield,
  Sparkles,
  ListChecks,
  HeartHandshake,
  Lock,
  HelpCircle,
  Clock,
  Brain,
  Utensils,
  UserCog,
  ChefHat,
  ArrowRight,
  RefreshCw,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useEffect } from 'react';

// ── Config ──────────────────────────────────────────────────────────
const SUPPORT_EMAIL = 'support@mynutrizen.fr';

// ── SEO head side-effect ────────────────────────────────────────────
const PAGE_TITLE = 'À propos de NutriZen — Menus personnalisés & équilibrés';
const PAGE_DESCRIPTION =
  'Découvrez la mission de NutriZen : simplifier vos repas au quotidien grâce à des menus personnalisés, sûrs et respectueux de vos allergies.';

// ── Data ────────────────────────────────────────────────────────────
const MISSION_BULLETS = [
  { icon: Clock, text: 'Gagner du temps chaque semaine' },
  { icon: Utensils, text: 'Manger plus équilibré sans complexité' },
  { icon: Brain, text: 'Réduire la charge mentale (courses, idées, organisation)' },
];

const STEPS = [
  {
    number: '1',
    icon: UserCog,
    title: 'Vous renseignez votre profil',
    text: 'Allergies, régimes, préférences, taille du foyer… tout est pris en compte.',
  },
  {
    number: '2',
    icon: Sparkles,
    title: 'NutriZen génère vos menus',
    text: 'Un menu complet pour la semaine, adapté à vos contraintes, en quelques secondes.',
  },
  {
    number: '3',
    icon: ChefHat,
    title: 'Vous cuisinez, vous ajustez, vous progressez',
    text: 'Swappez une recette, ajustez les portions, suivez vos macros — à votre rythme.',
  },
];

const VALUES = [
  {
    icon: Eye,
    title: 'Transparence',
    text: 'Nous expliquons clairement comment vos données sont utilisées et comment les menus sont générés.',
  },
  {
    icon: Sparkles,
    title: 'Simplicité',
    text: 'Chaque fonctionnalité est pensée pour être comprise en 3 secondes.',
  },
  {
    icon: Shield,
    title: 'Fiabilité',
    text: 'Les allergies sont des contraintes bloquantes — jamais de compromis sur la sécurité alimentaire.',
  },
  {
    icon: RefreshCw,
    title: 'Amélioration continue',
    text: 'Vos retours façonnent le produit. Chaque mise à jour vous rend la vie plus simple.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'NutriZen est-il gratuit ?',
    a: 'Oui, le compte de base est gratuit à vie : accès aux menus, recettes et listes de courses. Certaines fonctionnalités premium (IA, analyses avancées…) sont déblocables avec des Crédits Zen, achetables à la carte — sans abonnement obligatoire.',
  },
  {
    q: 'Puis-je exclure des aliments ?',
    a: 'Absolument. Dans votre profil, listez les aliments à éviter : ils seront exclus de tous les menus générés.',
  },
  {
    q: 'Comment sont gérées les allergies ?',
    a: 'Les allergies sont traitées comme des contraintes strictes (bloquantes). Aucune recette contenant un allergène déclaré ne sera proposée. En cas de doute sur un ingrédient, vérifiez toujours l\'étiquette du produit.',
  },
  {
    q: 'Puis-je changer une recette ?',
    a: 'Oui, la fonction « swap » permet de remplacer n\'importe quelle recette d\'un menu par une alternative compatible avec vos contraintes.',
  },
  {
    q: 'Les crédits expirent-ils ?',
    a: 'Les crédits achetés à la carte (lifetime) n\'expirent pas. Les crédits offerts avec un abonnement sont remis à zéro selon la cadence de votre plan.',
  },
];

// ── Component ───────────────────────────────────────────────────────
export default function About() {
  const navigate = useNavigate();

  // SEO: set title & meta (React Router project — no next/head)
  useEffect(() => {
    document.title = PAGE_TITLE;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };
    const setOg = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta('description', PAGE_DESCRIPTION);
    setOg('og:title', PAGE_TITLE);
    setOg('og:description', PAGE_DESCRIPTION);
    setOg('og:type', 'website');
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => navigate('/auth/signup')} />

      <main className="flex-1">
        {/* ── 1. Hero ──────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-primary/10 to-background">
          <div className="container max-w-4xl text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              À propos de NutriZen
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Des menus personnalisés qui respectent vos préférences, vos contraintes et vos
              allergies — sans prise de tête.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-primary to-accent text-white shadow-glow hover:scale-[1.02] active:scale-[0.99] transition-tech"
              >
                <Link to="/">Découvrir NutriZen</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contact">Nous contacter</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── 2. Mission ──────────────────────────────────── */}
        <section className="py-16">
          <div className="container max-w-3xl">
            <Card className="p-8 md:p-10 space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold">Notre mission</h2>
              <ul className="space-y-4">
                {MISSION_BULLETS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-base md:text-lg">{text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* ── 3. Comment ça marche ─────────────────────────── */}
        <section className="py-16 bg-gradient-to-b from-secondary/20 to-background">
          <div className="container max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              Comment ça marche
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map(({ number, icon: Icon, title, text }) => (
                <Card
                  key={number}
                  className="p-6 relative overflow-hidden hover:shadow-lg transition-tech"
                >
                  <span className="absolute top-4 right-4 text-6xl font-bold text-primary/5">
                    {number}
                  </span>
                  <div className="relative space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground italic">
              Vos allergies et aliments à éviter sont traités comme des contraintes strictes.
            </p>
          </div>
        </section>

        {/* ── 4. Sécurité & allergies ──────────────────────── */}
        <section className="py-16">
          <div className="container max-w-3xl">
            <Card className="p-8 md:p-10 border-destructive/30 bg-destructive/5 space-y-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <h2 className="text-2xl font-bold">Sécurité avant tout</h2>
              </div>
              <ul className="space-y-3 text-sm md:text-base leading-relaxed">
                <li className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-destructive/80" />
                  <span>
                    Les allergies sont des <strong>contraintes bloquantes</strong> : aucune
                    recette contenant un allergène déclaré ne sera proposée.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive/80" />
                  <span>
                    En cas de doute ou d'ingrédients ambigus, vérifiez toujours l'étiquette du
                    produit.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-destructive/80" />
                  <span>
                    NutriZen <strong>ne remplace pas un avis médical</strong>. Consultez un
                    professionnel de santé pour toute question nutritionnelle spécifique.
                  </span>
                </li>
              </ul>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/profile">
                  Mettre à jour mon profil <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </Card>
          </div>
        </section>

        {/* ── 5. Nos valeurs ───────────────────────────────── */}
        <section className="py-16 bg-gradient-to-b from-secondary/20 to-background">
          <div className="container max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Nos valeurs</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUES.map(({ icon: Icon, title, text }) => (
                <Card key={title} className="p-6 space-y-3 hover:shadow-lg transition-tech">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. Données & confidentialité ─────────────────── */}
        <section className="py-16">
          <div className="container max-w-3xl">
            <Card className="p-8 md:p-10 space-y-5">
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Données & confidentialité</h2>
              </div>
              <ul className="space-y-2 text-sm md:text-base text-muted-foreground leading-relaxed">
                <li>• Nous ne collectons que les données strictement nécessaires au service.</li>
                <li>• Aucune revente de données à des tiers.</li>
                <li>• Hébergement sécurisé avec chiffrement des données sensibles.</li>
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/legal/confidentialite">Politique de confidentialité</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* ── 7. FAQ ───────────────────────────────────────── */}
        <section className="py-16 bg-gradient-to-b from-secondary/20 to-background">
          <div className="container max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              Questions fréquentes
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {FAQ_ITEMS.map(({ q, a }, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left text-sm md:text-base font-medium hover:no-underline">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── 8. Final CTA ─────────────────────────────────── */}
        <section className="py-24 bg-gradient-to-br from-accent/10 to-primary/10">
          <div className="container max-w-3xl text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Prêt à simplifier tes repas ?
            </h2>
            <Button
              onClick={() => navigate('/auth/signup')}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent text-white shadow-glow hover:scale-[1.02] active:scale-[0.99] transition-tech text-lg px-12"
            >
              Créer mon premier menu
            </Button>
            <p className="text-sm text-muted-foreground">
              Gratuit, sans carte bancaire.
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}

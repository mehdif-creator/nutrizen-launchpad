import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Link } from 'react-router-dom';
import type { FAQCopy } from '@/config/marketingCopy';

interface FAQProps {
  copy?: FAQCopy;
}

const defaultFaqs = [
  {
    question: "C'est quoi la différence avec chercher des recettes sur Google ?",
    answer: "Google vous donne des milliers de résultats non personnalisés. NutriZen génère un menu complet adapté à vos goûts, allergies et objectifs, avec la liste de courses associée — en 30 secondes.",
  },
  {
    question: "Est-ce que ça marche si toute ma famille a des goûts différents ?",
    answer: "Oui. Vous renseignez les préférences et allergies de chaque membre du foyer, et NutriZen propose des menus qui conviennent à tout le monde. Vous pouvez aussi ajuster les portions individuellement.",
  },
  {
    question: "Je ne suis pas très cuisinier(e) — les recettes sont simples ?",
    answer: "Toutes nos recettes sont conçues pour être préparées en 20 à 30 minutes, avec des instructions pas à pas. Aucune technique compliquée requise.",
  },
  {
    question: "Est-ce que ça fonctionne pour les végétariens et les intolérants ?",
    answer: "Absolument. Vous pouvez indiquer végétarien, vegan, sans gluten, sans lactose, ou toute autre restriction. NutriZen adapte 100% des recettes proposées.",
  },
  {
    question: "Je peux annuler à tout moment ?",
    answer: "Oui, sans condition. Un clic depuis votre espace membre suffit. Pas de frais cachés, pas d'engagement minimum.",
  },
  {
    question: "Combien de temps ça prend vraiment par semaine ?",
    answer: "5 minutes le dimanche pour générer votre menu et votre liste de courses. C'est tout. Le reste de la semaine, vous suivez le plan.",
  },
];

export const FAQ = ({ copy }: FAQProps) => {
  const items = copy?.items || defaultFaqs;

  return (
    <section id="faq" className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Questions fréquentes</h2>
          <p className="text-lg text-muted-foreground">Tout ce que vous devez savoir avant de commencer</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible>
            {items.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Vous avez une autre question ?{' '}
          <Link to="/contact" className="text-accent hover:underline">
            Contactez-nous
          </Link>{' '}
          — Réponse sous 24h.
        </p>
      </div>
    </section>
  );
};

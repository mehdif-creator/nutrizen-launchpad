import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

const weekDays = [
  {
    day: 'Lundi',
    meals: {
      breakfast: 'Porridge protéiné aux fruits rouges',
      lunch: 'Bowl poulet teriyaki et riz basmati',
      dinner: 'Saumon grillé, brocolis et quinoa'
    },
    macros: { calories: 2100, protein: 140, carbs: 210, fat: 65 }
  },
  {
    day: 'Mardi',
    meals: {
      breakfast: 'Œufs brouillés et pain complet',
      lunch: 'Pâtes complètes, dinde et légumes',
      dinner: 'Curry de lentilles et riz'
    },
    macros: { calories: 2050, protein: 135, carbs: 220, fat: 60 }
  },
  {
    day: 'Mercredi',
    meals: {
      breakfast: 'Smoothie banane, avoine, whey',
      lunch: 'Steak haché, patates douces rôties',
      dinner: 'Wrap poulet, avocat, crudités'
    },
    macros: { calories: 2150, protein: 145, carbs: 200, fat: 70 }
  },
  {
    day: 'Jeudi',
    meals: {
      breakfast: 'Pancakes protéinés et sirop d\'érable',
      lunch: 'Riz, poulet mariné, haricots verts',
      dinner: 'Pizza maison à la pâte complète'
    },
    macros: { calories: 2200, protein: 150, carbs: 230, fat: 65 }
  },
  {
    day: 'Vendredi',
    meals: {
      breakfast: 'Yaourt grec, granola, fruits',
      lunch: 'Burger maison et frites de patate douce',
      dinner: 'Poisson blanc, ratatouille, boulgour'
    },
    macros: { calories: 2100, protein: 140, carbs: 210, fat: 68 }
  },
  {
    day: 'Samedi',
    meals: {
      breakfast: 'Tartines avocat, œuf poché',
      lunch: 'Tacos au bœuf et légumes grillés',
      dinner: 'Risotto aux champignons'
    },
    macros: { calories: 2250, protein: 135, carbs: 240, fat: 72 }
  },
  {
    day: 'Dimanche',
    meals: {
      breakfast: 'Crêpes protéinées et fruits',
      lunch: 'Poulet rôti, légumes et purée',
      dinner: 'Salade composée au thon'
    },
    macros: { calories: 2000, protein: 130, carbs: 195, fat: 65 }
  }
];

const shoppingList = {
  'Fruits & Légumes': [
    'Fruits rouges (300g)',
    'Bananes (6)',
    'Brocolis (2)',
    'Patates douces (1kg)',
    'Avocat (3)',
    'Tomates (6)',
    'Salade verte (2)'
  ],
  'Protéines': [
    'Poulet (1,2kg)',
    'Saumon (400g)',
    'Steak haché 5% (500g)',
    'Dinde hachée (400g)',
    'Œufs (18)',
    'Thon en boîte (2)',
    'Whey vanille'
  ],
  'Féculents': [
    'Riz basmati (1kg)',
    'Pâtes complètes (500g)',
    'Quinoa (400g)',
    'Pain complet',
    'Flocons d\'avoine (500g)'
  ],
  'Épicerie': [
    'Huile d\'olive',
    'Sauce soja',
    'Curry en poudre',
    'Sirop d\'érable',
    'Lentilles corail (400g)'
  ]
};

export const ExampleWeek = () => {
  const [currentDay, setCurrentDay] = useState(0);

  const nextDay = () => {
    setCurrentDay((prev) => (prev + 1) % weekDays.length);
  };

  const prevDay = () => {
    setCurrentDay((prev) => (prev - 1 + weekDays.length) % weekDays.length);
  };

  const day = weekDays[currentDay];

  return (
    <section id="exemples" className="py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            À quoi ressemble une semaine ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Voici un exemple de plan hebdomadaire généré en 30 secondes
          </p>
        </div>

        {/* Carousel */}
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 bg-background border-border shadow-card">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={prevDay}
                className="hover:scale-105 transition-tech"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="text-center">
                <h3 className="text-2xl font-bold mb-1">{day.day}</h3>
                <div className="flex gap-2 justify-center">
                  {weekDays.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentDay(index)}
                      className={`w-2 h-2 rounded-full transition-tech ${
                        index === currentDay ? 'bg-primary w-8' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextDay}
                className="hover:scale-105 transition-tech"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Meals */}
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Petit-déjeuner</div>
                <div className="font-medium">{day.meals.breakfast}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Déjeuner</div>
                <div className="font-medium">{day.meals.lunch}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Dîner</div>
                <div className="font-medium">{day.meals.dinner}</div>
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-primary/5 rounded-lg mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{day.macros.calories}</div>
                <div className="text-xs text-muted-foreground">kcal</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{day.macros.protein}g</div>
                <div className="text-xs text-muted-foreground">Protéines</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{day.macros.carbs}g</div>
                <div className="text-xs text-muted-foreground">Glucides</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{day.macros.fat}g</div>
                <div className="text-xs text-muted-foreground">Lipides</div>
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full hover:scale-[1.02] transition-tech" variant="outline">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Voir la liste de courses
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Liste de courses de la semaine</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {Object.entries(shoppingList).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="font-bold mb-3 text-primary">{category}</h4>
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            💡 Macros indicatives — adaptées selon tes objectifs et ton profil
          </p>
        </div>
      </div>
    </section>
  );
};

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

const weekDays = [
  {
    day: 'Lundi',
    meals: {
      lunch: 'Bowl poulet teriyaki et riz basmati',
      dinner: 'Saumon grillé, brocolis et quinoa'
    },
    macros: { calories: 1450, protein: 95, carbs: 140, fat: 48 }
  },
  {
    day: 'Mardi',
    meals: {
      lunch: 'Pâtes complètes, dinde et légumes',
      dinner: 'Curry de lentilles et riz'
    },
    macros: { calories: 1380, protein: 88, carbs: 155, fat: 42 }
  },
  {
    day: 'Mercredi',
    meals: {
      lunch: 'Steak haché, patates douces rôties',
      dinner: 'Wrap poulet, avocat, crudités'
    },
    macros: { calories: 1420, protein: 98, carbs: 130, fat: 52 }
  },
  {
    day: 'Jeudi',
    meals: {
      lunch: 'Riz, poulet mariné, haricots verts',
      dinner: 'Pizza maison à la pâte complète'
    },
    macros: { calories: 1500, protein: 102, carbs: 165, fat: 48 }
  },
  {
    day: 'Vendredi',
    meals: {
      lunch: 'Burger maison et frites de patate douce',
      dinner: 'Poisson blanc, ratatouille, boulgour'
    },
    macros: { calories: 1400, protein: 92, carbs: 145, fat: 50 }
  },
  {
    day: 'Samedi',
    meals: {
      lunch: 'Tacos au bœuf et légumes grillés',
      dinner: 'Risotto aux champignons'
    },
    macros: { calories: 1520, protein: 90, carbs: 170, fat: 55 }
  },
  {
    day: 'Dimanche',
    meals: {
      lunch: 'Poulet rôti, légumes et purée',
      dinner: 'Salade composée au thon'
    },
    macros: { calories: 1350, protein: 88, carbs: 125, fat: 48 }
  }
];

const shoppingList = {
  'Fruits & Légumes': [
    'Brocolis (2)',
    'Patates douces (1kg)',
    'Avocat (3)',
    'Tomates (6)',
    'Salade verte (2)',
    'Haricots verts (400g)',
    'Champignons (300g)'
  ],
  'Protéines': [
    'Poulet (1,2kg)',
    'Saumon (400g)',
    'Steak haché 5% (500g)',
    'Dinde hachée (400g)',
    'Thon en boîte (2)',
    'Poisson blanc (400g)'
  ],
  'Féculents': [
    'Riz basmati (1kg)',
    'Pâtes complètes (500g)',
    'Quinoa (400g)',
    'Boulgour (300g)',
    'Pâte à pizza (2)'
  ],
  'Épicerie': [
    'Huile d\'olive',
    'Sauce soja',
    'Curry en poudre',
    'Lentilles corail (400g)',
    'Tortillas (8)'
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
            Découvre un exemple de menu généré par NutriZen, entièrement personnalisable.
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

            {/* Meals - Only Lunch and Dinner */}
            <div className="space-y-4 mb-6">
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
            Les menus sont adaptés à tes objectifs et préférences. Tu peux changer chaque repas.
          </p>
        </div>
      </div>
    </section>
  );
};

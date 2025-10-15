import { Button } from '@/components/ui/button';

const recipes = [
  {
    title: 'Poulet au curry',
    image: '/img/recipe-curry.jpg',
  },
  {
    title: 'Nouilles sautées aux légumes',
    image: '/img/recipe-noodles.jpg',
  },
  {
    title: 'Lasagnes alla bolognese',
    image: '/img/recipe-lasagna.jpg',
  },
  {
    title: 'Omelette maison & salade grecque',
    image: '/img/recipe-omelette.jpg',
  },
  {
    title: 'Salade au poulet pané',
    image: '/img/recipe-salad.jpg',
  },
  {
    title: 'Saumon au pesto & champignons',
    image: '/img/recipe-salmon.jpg',
  },
];

export const RecipeGallery = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-background to-[#FFF8F2]">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Des recettes équilibrées, gourmandes et faciles
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Créées par notre équipe de nutritionnistes pour tous les goûts et budgets.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          {recipes.map((recipe, index) => (
            <div
              key={recipe.title}
              className="group relative overflow-hidden rounded-2xl bg-muted aspect-square animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform">
                <h3 className="font-semibold text-sm md:text-base">{recipe.title}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-accent to-accent/80 text-white hover:scale-[1.02] active:scale-[0.99] transition-tech"
          >
            Découvrir plus de recettes
          </Button>
        </div>
      </div>
    </section>
  );
};

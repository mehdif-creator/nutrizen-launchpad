import { useRecipesGallery } from '@/hooks/useRecipesGallery';
import { Spinner } from '@/components/common/Spinner';

export const RecipeGallery = () => {
  const { data: recipes, isLoading } = useRecipesGallery();

  if (isLoading) {
    return (
      <section className="py-12 md:py-16 bg-gradient-to-b from-background to-[#FFF8F2]">
        <div className="container">
          <div className="text-center">
            <Spinner />
          </div>
        </div>
      </section>
    );
  }

  if (!recipes || recipes.length === 0) {
    return null;
  }

  // Duplicate recipes for infinite scroll effect
  const duplicatedRecipes = [...recipes, ...recipes];

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-background to-[#FFF8F2] overflow-hidden">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
            Des recettes équilibrées, gourmandes et faciles
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Créées par notre équipe de nutritionnistes pour tous les goûts et budgets.
          </p>
        </div>

        <div className="relative">
          {/* First row - scrolling left */}
          <div className="mb-4 overflow-hidden">
            <div className="flex gap-4 animate-scroll-left">
              {duplicatedRecipes.slice(0, Math.ceil(duplicatedRecipes.length / 2)).map((recipe, index) => (
                <div
                  key={`row1-${recipe.id}-${index}`}
                  className="flex-shrink-0 w-[200px] md:w-[250px] group relative overflow-hidden rounded-xl bg-muted aspect-[4/3]"
                >
                  <img
                    src={recipe.image_url || '/img/recipe-default.jpg'}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <h3 className="font-semibold text-xs md:text-sm line-clamp-2">{recipe.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Second row - scrolling right */}
          <div className="overflow-hidden">
            <div className="flex gap-4 animate-scroll-right">
              {duplicatedRecipes.slice(Math.ceil(duplicatedRecipes.length / 2)).map((recipe, index) => (
                <div
                  key={`row2-${recipe.id}-${index}`}
                  className="flex-shrink-0 w-[200px] md:w-[250px] group relative overflow-hidden rounded-xl bg-muted aspect-[4/3]"
                >
                  <img
                    src={recipe.image_url || '/img/recipe-default.jpg'}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <h3 className="font-semibold text-xs md:text-sm line-clamp-2">{recipe.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import { useRecipesGallery } from "@/hooks/useRecipesGallery";
import { Spinner } from "@/components/common/Spinner";
import { useLanguage } from '@/contexts/LanguageContext';
import { getRecipeImageUrl, handleImageError } from '@/lib/images';

export const RecipeGallery = () => {
  const { data: recipes, isLoading, error } = useRecipesGallery();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <section className="py-12 md:py-16 bg-gradient-to-b from-background to-[#FFF8F2]">
        <div className="container">
          <div className="text-center">
            <Spinner />
            <p className="text-sm text-muted-foreground mt-2">Chargement des recettes...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 md:py-16 bg-gradient-to-b from-background to-[#FFF8F2]">
        <div className="container">
          <div className="text-center">
            <p className="text-muted-foreground">Impossible de charger les recettes. Réessayez plus tard.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!recipes || recipes.length === 0) {
    return (
      <section className="py-12 md:py-16 bg-gradient-to-b from-background to-[#FFF8F2]">
        <div className="container">
          <div className="text-center">
            <p className="text-muted-foreground">Aucune recette à afficher pour le moment.</p>
          </div>
        </div>
      </section>
    );
  }

  // Split recipes into two different sets and duplicate each for infinite scroll
  const midPoint = Math.ceil(recipes.length / 2);
  const firstRowRecipes = [...recipes.slice(0, midPoint), ...recipes.slice(0, midPoint)];
  const secondRowRecipes = [...recipes.slice(midPoint), ...recipes.slice(midPoint)];

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-background to-[#FFF8F2] overflow-hidden">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
            {t('recipes.title')}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            {t('recipes.subtitle')}
          </p>
        </div>

        <div className="relative">
          {/* First row - scrolling left */}
          <div className="mb-4 overflow-hidden">
            <div className="flex gap-4 animate-scroll-left">
              {firstRowRecipes.map((recipe, index) => (
                <div
                  key={`row1-${recipe.id}-${index}`}
                  className="flex-shrink-0 w-[200px] md:w-[250px] group relative overflow-hidden rounded-xl bg-muted aspect-[4/3]"
                >
                  <img
                    src={getRecipeImageUrl(recipe)}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={handleImageError}
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
              {secondRowRecipes.map((recipe, index) => (
                <div
                  key={`row2-${recipe.id}-${index}`}
                  className="flex-shrink-0 w-[200px] md:w-[250px] group relative overflow-hidden rounded-xl bg-muted aspect-[4/3]"
                >
                  <img
                    src={getRecipeImageUrl(recipe)}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={handleImageError}
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

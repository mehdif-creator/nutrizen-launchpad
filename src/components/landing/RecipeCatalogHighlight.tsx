import { BookOpen } from 'lucide-react';
import { RECIPE_CATALOG_COPY } from '@/config/landingOffer';

export const RecipeCatalogHighlight = () => (
  <div className="flex items-start gap-3 border-l-2 border-primary py-1 pl-4" data-recipe-catalog>
    <BookOpen className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    <div className="min-w-0 space-y-1">
      <p className="text-base font-semibold text-primary-foreground">{RECIPE_CATALOG_COPY.title}</p>
      <p className="text-sm text-primary-foreground/80">{RECIPE_CATALOG_COPY.updates}</p>
    </div>
  </div>
);
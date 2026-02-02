/**
 * Recipe Macros Page
 * 
 * Displays all recipe macros with cursor-based pagination.
 * Route: /recipes/macros
 */

import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { RecipeMacrosTable } from '@/components/recipes/RecipeMacrosTable';
import { BarChart3 } from 'lucide-react';

export default function RecipeMacros() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <AppHeader />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Macros des Recettes</h1>
            </div>
            <p className="text-muted-foreground">
              Consultez les valeurs nutritionnelles calculées pour chaque recette.
              Les données sont issues de la base CIQUAL et mises à jour régulièrement.
            </p>
          </div>

          {/* Macros Table with pagination */}
          <RecipeMacrosTable limit={25} />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

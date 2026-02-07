import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface MenuGenerationErrorProps {
  errorType: 'NO_SAFE_RECIPES' | 'SAFETY_VALIDATION_FAILED' | 'NO_RECIPES_IN_DB' | 'UNKNOWN';
  restrictions?: string[];
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * Error state component for menu generation failures
 * Provides clear messaging and actionable next steps
 */
export function MenuGenerationError({
  errorType,
  restrictions = [],
  message,
  onRetry,
  retrying = false,
}: MenuGenerationErrorProps) {
  const getErrorContent = () => {
    switch (errorType) {
      case 'NO_SAFE_RECIPES':
        return {
          title: 'Aucune recette compatible',
          description: `Nous n'avons pas trouvé assez de recettes qui respectent toutes tes restrictions alimentaires.`,
          suggestion: 'Essaie de modifier tes préférences pour élargir les options disponibles.',
          showRestrictions: true,
        };
      case 'SAFETY_VALIDATION_FAILED':
        return {
          title: 'Problème de sécurité alimentaire',
          description: 'Certaines recettes sélectionnées contenaient des aliments que tu évites.',
          suggestion: 'Nous avons bloqué ces recettes. Réessaie ou contacte le support.',
          showRestrictions: true,
        };
      case 'NO_RECIPES_IN_DB':
        return {
          title: 'Base de recettes vide',
          description: 'Aucune recette n\'est disponible actuellement.',
          suggestion: 'Contacte le support pour signaler ce problème.',
          showRestrictions: false,
        };
      default:
        return {
          title: 'Erreur de génération',
          description: message || 'Une erreur inattendue s\'est produite.',
          suggestion: 'Réessaie dans quelques instants.',
          showRestrictions: false,
        };
    }
  };

  const content = getErrorContent();

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {content.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-destructive/80">
          {content.description}
        </p>

        {content.showRestrictions && restrictions.length > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Tes restrictions actuelles :
            </p>
            <div className="flex flex-wrap gap-2">
              {restrictions.map((restriction) => (
                <span 
                  key={restriction}
                  className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full"
                >
                  {restriction}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          💡 {content.suggestion}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {onRetry && (
            <Button 
              onClick={onRetry} 
              disabled={retrying}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Régénération...' : 'Réessayer'}
            </Button>
          )}
          <Button asChild variant="outline" className="flex-1">
            <Link to="/app/profile">
              <Settings className="h-4 w-4 mr-2" />
              Modifier mes préférences
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

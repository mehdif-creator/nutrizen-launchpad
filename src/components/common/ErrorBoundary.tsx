import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary - Protection globale contre les crashs React
 * 
 * Affiche un écran de fallback en français quand une erreur non gérée survient.
 * Particulièrement utile pour les bugs mobiles (dropdowns, hydratation, portals).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error for debugging (lightweight client logging)
    logger.error('Caught error', error, { componentStack: errorInfo.componentStack });
    
    // Optional: send to server for mobile error tracking
    this.logErrorToServer(error, errorInfo);
  }

  private logErrorToServer(error: Error, errorInfo: ErrorInfo) {
    // Only log in production and with throttling
    if (import.meta.env.DEV) return;
    
    try {
      // Simple throttle: max 1 error per minute per session
      const lastErrorTime = sessionStorage.getItem('lastErrorLogTime');
      const now = Date.now();
      
      if (lastErrorTime && now - parseInt(lastErrorTime) < 60000) {
        return;
      }
      
      sessionStorage.setItem('lastErrorLogTime', String(now));
      
      // Log to console for now (could be extended to Supabase table)
      logger.error('Client error captured', error, {
        componentStack: errorInfo.componentStack?.slice(0, 500),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    } catch {
      // Silently fail - don't crash the error handler
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    // Intentional hard reload: after a React crash, component tree is corrupted
    // so we need a full page reload to restore a clean state
    window.location.href = '/app/dashboard';
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default French fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-xl">Oups, un souci technique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Quelque chose ne s'est pas passé comme prévu. 
                Rechargez la page pour réessayer.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-auto max-h-32">
                  <p className="text-destructive font-semibold">{this.state.error.message}</p>
                  {this.state.error.stack && (
                    <pre className="text-muted-foreground mt-2 whitespace-pre-wrap">
                      {this.state.error.stack.slice(0, 500)}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={this.handleReload} 
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recharger la page
                </Button>
                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Tableau de bord
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Si le problème persiste, contactez le support.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for functional components to trigger error boundary
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}

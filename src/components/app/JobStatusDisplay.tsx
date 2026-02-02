import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { JobStatus } from '@/hooks/useAutomationJob';

interface JobStatusDisplayProps {
  status: JobStatus;
  error?: string | null;
  onRetry?: () => void;
  messages?: {
    queued?: string;
    running?: string;
    success?: string;
    error?: string;
  };
}

const DEFAULT_MESSAGES = {
  queued: 'En file d\'attente...',
  running: 'Traitement en cours...',
  success: 'Termine avec succes !',
  error: 'Une erreur est survenue.',
};

export function JobStatusDisplay({
  status,
  error,
  onRetry,
  messages = {},
}: JobStatusDisplayProps) {
  const displayMessages = { ...DEFAULT_MESSAGES, ...messages };

  if (status === 'idle') {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {(status === 'queued' || status === 'running') && (
            <>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-white rounded-full blur-xl opacity-50 animate-pulse" />
                <Loader2 className="h-12 w-12 text-primary animate-spin relative z-10" />
              </div>
              <div>
                <p className="text-lg font-semibold mb-1">
                  {status === 'queued' ? displayMessages.queued : displayMessages.running}
                </p>
                <p className="text-sm text-muted-foreground">
                  Veuillez patienter quelques instants…
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-green-600">
                {displayMessages.success}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <div>
                <p className="text-lg font-semibold text-destructive mb-1">
                  {displayMessages.error}
                </p>
                {error && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {error}
                  </p>
                )}
                {onRetry && (
                  <Button onClick={onRetry} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Réessayer
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

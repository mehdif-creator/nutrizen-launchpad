import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { functionsBaseUrl } from '@/lib/supabaseUrls';

const PinterestOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      setErrorMessage("Missing code or state parameters in callback URL.");
      setStatus('error');
      return;
    }

    const exchangeCode = async () => {
      try {
        const url = `${functionsBaseUrl()}/pinterest-oauth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        const res = await fetch(url, { method: 'GET' });
        const data = await res.json();

        if (data.ok) {
          setStatus('success');
          setTimeout(() => navigate('/admin/automation/settings'), 2000);
        } else {
          setErrorMessage(data.message ?? "Unknown error during Pinterest connection.");
          setStatus('error');
        }
      } catch {
        setErrorMessage("Unable to reach the server. Please try again.");
        setStatus('error');
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 p-8 max-w-md text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground text-lg">Connecting your Pinterest account...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-foreground text-xl font-semibold">Pinterest connected successfully!</p>
            <p className="text-muted-foreground">Redirecting to settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-destructive" />
            <p className="text-foreground text-xl font-semibold">Pinterest connection failed</p>
            <p className="text-destructive text-sm">{errorMessage}</p>
            <button
              onClick={() => navigate('/app/dashboard')}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PinterestOAuthCallback;

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const PinterestCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      setErrorMessage("Paramètres manquants dans l'URL de callback.");
      setStatus('error');
      return;
    }

    const callEdgeFunction = async () => {
      try {
        const url = `https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/pinterest-oauth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        const res = await fetch(url, { method: 'GET' });
        const data = await res.json();

        if (data.ok) {
          setStatus('success');
          setTimeout(() => navigate('/admin/automation/settings'), 1500);
        } else {
          setErrorMessage(data.message ?? "Erreur inconnue lors de la connexion Pinterest.");
          setStatus('error');
        }
      } catch {
        setErrorMessage("Impossible de contacter le serveur. Réessaie.");
        setStatus('error');
      }
    };

    callEdgeFunction();
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground text-lg">Connexion Pinterest en cours...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <p className="text-foreground text-xl font-semibold">Pinterest connecté avec succès !</p>
        <p className="text-muted-foreground">Redirection en cours...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <XCircle className="w-12 h-12 text-destructive" />
      <p className="text-foreground text-xl font-semibold">Échec de la connexion Pinterest</p>
      <p className="text-destructive text-sm max-w-md text-center">{errorMessage}</p>
      <button
        onClick={() => navigate('/admin/automation/settings')}
        className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
      >
        Retour aux paramètres
      </button>
    </div>
  );
};

export default PinterestCallback;

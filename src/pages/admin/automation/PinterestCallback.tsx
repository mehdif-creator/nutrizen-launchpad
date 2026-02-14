import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAutomationToast } from '@/components/automation/AutomationToast';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAutomationStore } from '@/components/automation/AutomationStore';
import { supabase } from '@/integrations/supabase/client';

const PinterestCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'stub'>('loading');
  const [message, setMessage] = useState('Authentification auprès de Pinterest en cours...');
  const { addToast } = useAutomationToast();
  const navigate = useNavigate();
  const { fetchInitialData } = useAutomationStore();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code || !state) {
        setStatus('stub');
        setMessage(`Callback reçu. Params: code=${code ? '✓' : '✗'}, state=${state ? '✓' : '✗'}. Debug admin: URL = ${window.location.href}`);
        return;
      }

      try {
        const { error } = await supabase.functions.invoke('pinterest-oauth-callback', {
          body: { code, state },
        });

        if (error) {
          try {
            const body = await error.context?.json();
            if (body?.code === 'PINTEREST_NOT_CONFIGURED') {
              setStatus('stub');
              setMessage("Mode Stub: Secrets Pinterest non configurés.");
              return;
            }
          } catch {}
          throw error;
        }

        setStatus('success');
        setMessage('Pinterest connecté avec succès !');
        addToast('Connexion Pinterest réussie', 'success');
        await fetchInitialData();
        setTimeout(() => navigate('/admin/automation/settings'), 2000);
      } catch (err: any) {
        console.error('OAuth Error:', err);
        setStatus('error');
        setMessage(err.message || "Erreur lors de l'échange du token.");
        addToast('Échec de la connexion Pinterest', 'error');
      }
    };

    handleCallback();
  }, [addToast, navigate, fetchInitialData, searchParams]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
      {status === 'loading' && <><Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" /><h2 className="text-xl font-semibold text-slate-800">Connexion en cours...</h2></>}
      {status === 'success' && <><CheckCircle className="w-12 h-12 text-green-500 mb-4" /><h2 className="text-xl font-semibold text-slate-800">Succès !</h2></>}
      {status === 'error' && <><XCircle className="w-12 h-12 text-red-500 mb-4" /><h2 className="text-xl font-semibold text-slate-800">Erreur</h2></>}
      {status === 'stub' && <><AlertTriangle className="w-12 h-12 text-amber-500 mb-4" /><h2 className="text-xl font-semibold text-slate-800">Pinterest Callback</h2></>}
      <p className="text-slate-500 mt-2 max-w-md">{message}</p>
      {status !== 'loading' && (
        <button onClick={() => navigate('/admin/automation/settings')} className="mt-6 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Retour aux paramètres</button>
      )}
    </div>
  );
};

export default PinterestCallback;

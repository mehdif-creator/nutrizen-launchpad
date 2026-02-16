import React, { useState, useEffect } from 'react';
import { Loader2, Check, RefreshCw, Zap, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { functionsBaseUrl } from '@/lib/supabaseUrls';
import { useAutomationToast } from '@/components/automation/AutomationToast';

interface PinterestStatus {
  connected: boolean;
  scope?: string;
  expiresAt?: string;
}

const PinterestConnectionCard: React.FC = () => {
  const { addToast } = useAutomationToast();
  const [status, setStatus] = useState<PinterestStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('pinterest_oauth')
        .select('scope, expires_at')
        .eq('account_label', 'main')
        .maybeSingle();

      if (data && data.expires_at && new Date(data.expires_at) > new Date()) {
        setStatus({ connected: true, scope: data.scope ?? undefined, expiresAt: data.expires_at });
      } else {
        setStatus({ connected: false });
      }
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkStatus(); }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`${functionsBaseUrl()}/pinterest-oauth-start`, { method: 'GET' });
      const data = await res.json();
      if (data.ok && data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        addToast(data.message || "Failed to get Pinterest auth URL", "error");
      }
    } catch {
      addToast("Unable to start Pinterest connection", "error");
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${functionsBaseUrl()}/pinterest-oauth-start`, { method: 'GET' });
      const data = await res.json();
      if (data.ok) {
        addToast("Connection OK ✅", "success");
      } else {
        addToast("Connection failed ❌", "error");
      }
    } catch {
      addToast("Connection test failed ❌", "error");
    } finally {
      setTesting(false);
    }
  };

  const PinterestLogo = () => (
    <svg className="w-5 h-5 text-[#E60023]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.173 0 7.41 2.967 7.41 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z" />
    </svg>
  );

  if (loading) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading Pinterest status...
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <PinterestLogo /> Pinterest API
        </h2>
        <div className="flex items-center gap-2">
          {status.connected ? (
            <>
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                <Check className="w-3 h-3" /> Connected
              </span>
              <button onClick={checkStatus} className="p-1 text-slate-400 hover:text-emerald-600" title="Refresh status">
                <RefreshCw className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="text-sm font-medium text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition"
              style={{ backgroundColor: '#E60023' }}
            >
              {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
              Connect Pinterest
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {status.connected ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Scope:</span>
                <p className="font-mono text-slate-700 mt-0.5">{status.scope || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-500">Valid until:</span>
                <p className="text-slate-700 mt-0.5">
                  {status.expiresAt
                    ? new Date(status.expiresAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 flex items-center gap-2"
              >
                {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Reconnect
              </button>
              <button
                onClick={handleTest}
                disabled={testing}
                className="text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 flex items-center gap-2"
              >
                {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Test Connection
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Connect a Pinterest Business account to enable automatic pin publishing.
          </p>
        )}
      </div>
    </section>
  );
};

export default PinterestConnectionCard;

import React, { useState, useEffect } from 'react';
import { useAutomationStore } from '@/components/automation/AutomationStore';
import { useAutomationToast } from '@/components/automation/AutomationToast';
import { Save, Globe, Loader2, Share2, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { AutomationSettings as AutomationSettingsType } from '@/components/automation/AutomationTypes';
import { supabase } from '@/integrations/supabase/client';

const AutomationSettingsPage: React.FC = () => {
  const { settings, saveSettings, fetchInitialData } = useAutomationStore();
  const { addToast } = useAutomationToast();
  const [formData, setFormData] = useState<AutomationSettingsType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingPinterest, setIsConnectingPinterest] = useState(false);
  const [pinterestConfigMissing, setPinterestConfigMissing] = useState(false);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  useEffect(() => { if (settings) setFormData(settings); }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? ({ ...prev, [name]: value }) : null);
  };

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    try { await saveSettings(formData); addToast("Paramètres sauvegardés", "success"); } catch { addToast("Erreur lors de la sauvegarde", "error"); } finally { setIsSaving(false); }
  };

  const handleConnectPinterest = async () => {
    setIsConnectingPinterest(true);
    setPinterestConfigMissing(false);
    try {
      const { data, error } = await supabase.functions.invoke('pinterest-oauth-start', { method: 'GET' });
      if (error) {
        try { const body = await error.context?.json(); if (body?.code === 'PINTEREST_NOT_CONFIGURED') { setPinterestConfigMissing(true); addToast("Configuration Pinterest manquante", "error"); return; } } catch {}
        throw error;
      }
      if (data?.auth_url) window.location.href = data.auth_url;
      else throw new Error("Pas d'URL d'authentification");
    } catch (e: any) { addToast(`Erreur connexion: ${e.message}`, "error"); } finally { setIsConnectingPinterest(false); }
  };

  if (!formData) return <div className="p-8 text-center">Chargement des paramètres...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-500">Gérez vos intégrations et configurations.</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Globe className="w-5 h-5 text-slate-500" /> Général</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fuseau Horaire</label>
              <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm sm:text-sm py-2 px-3 border bg-white">
                <option value="Europe/Paris">Europe/Paris (UTC+01:00)</option>
                <option value="America/New_York">New York (UTC-05:00)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Langue</label>
              <select name="language" value={formData.language} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm sm:text-sm py-2 px-3 border bg-white">
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.173 0 7.41 2.967 7.41 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z" /></svg>
            Pinterest API
          </h2>
          <div className="flex items-center gap-2">
            {formData.pinterestConnected ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100"><Check className="w-3 h-3" /> Connecté</span>
                <button onClick={() => fetchInitialData()} className="p-1 text-slate-400 hover:text-emerald-600"><RefreshCw className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={handleConnectPinterest} disabled={isConnectingPinterest} className="text-sm font-medium bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 flex items-center gap-2">
                {isConnectingPinterest ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                Connecter OAuth
              </button>
            )}
          </div>
        </div>
        {pinterestConfigMissing && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mx-6 mt-6">
            <div className="flex"><AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" /><p className="text-sm text-amber-700 ml-3"><strong>Secrets Manquants.</strong><br />Configurez <code>PINTEREST_CLIENT_ID</code> et <code>PINTEREST_REDIRECT_URI</code> dans vos Edge Functions.</p></div>
          </div>
        )}
        <div className="p-6"><p className="text-sm text-slate-500">Connectez un compte Pinterest Business pour activer la publication automatique.</p></div>
      </section>

      <div className="flex items-center justify-end gap-4 pt-4">
        <button onClick={() => settings && setFormData(settings)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50">Annuler</button>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm disabled:opacity-50">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
};

export default AutomationSettingsPage;

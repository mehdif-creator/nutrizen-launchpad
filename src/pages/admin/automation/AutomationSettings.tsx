import React, { useState, useEffect } from 'react';
import { useAutomationStore } from '@/components/automation/AutomationStore';
import { useAutomationToast } from '@/components/automation/AutomationToast';
import { Save, Globe, Loader2 } from 'lucide-react';
import { AutomationSettings as AutomationSettingsType } from '@/components/automation/AutomationTypes';
import PinterestConnectionCard from '@/components/automation/PinterestConnectionCard';

const AutomationSettingsPage: React.FC = () => {
  const { settings, saveSettings, fetchInitialData } = useAutomationStore();
  const { addToast } = useAutomationToast();
  const [formData, setFormData] = useState<AutomationSettingsType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

      <PinterestConnectionCard />

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

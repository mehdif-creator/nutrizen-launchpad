import React, { useState } from 'react';
import { useAutomationStore } from '@/components/automation/AutomationStore';
import { useAutomationToast } from '@/components/automation/AutomationToast';
import { Filter, Calendar, ExternalLink, RefreshCw, Trash2, Edit, Loader2, Play } from 'lucide-react';
import { SocialQueueItem } from '@/components/automation/AutomationTypes';
import AutomationModal from '@/components/automation/AutomationModal';
import { supabase } from '@/integrations/supabase/client';

const AutomationQueue: React.FC = () => {
  const { queue, removeFromQueue, updateQueueItem, fetchInitialData } = useAutomationStore();
  const { addToast } = useAutomationToast();
  const [filter, setFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<SocialQueueItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<SocialQueueItem | null>(null);

  const handleRetry = async (item: SocialQueueItem) => {
    try {
      await updateQueueItem(item.id, { status: 'rendered', error_message: undefined, publish_error: undefined, locked_at: undefined, scheduled_at: new Date().toISOString() });
      addToast("Élément remis en file d'attente", "success");
    } catch { addToast("Erreur lors de la réinitialisation", "error"); }
  };

  const handleForcePublish = async (item: SocialQueueItem) => {
    setProcessingId(item.id);
    try {
      addToast("Lancement de la publication forcée...", "info");
      const { error } = await supabase.functions.invoke('pinterest-publish', { body: { queue_id: item.id } });
      if (error) throw error;
      addToast("Publication réussie !", "success");
      await fetchInitialData();
    } catch (error: any) {
      addToast(`Erreur de publication: ${error.message || 'Erreur serveur'}`, "error");
      await fetchInitialData();
    } finally { setProcessingId(null); }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try { await removeFromQueue(itemToDelete.id); addToast("Élément supprimé", "success"); } catch { addToast("Erreur lors de la suppression", "error"); } finally { setItemToDelete(null); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;
    try {
      await updateQueueItem(itemToEdit.id, { pin_title: itemToEdit.pin_title, pin_description: itemToEdit.pin_description, scheduled_at: itemToEdit.scheduled_at, destination_url: itemToEdit.destination_url });
      addToast("Modifications enregistrées", "success");
      setItemToEdit(null);
    } catch { addToast("Erreur lors de la modification", "error"); }
  };

  const filteredItems = filter === 'all' ? queue : queue.filter(item => item.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'rendered': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'processing': return 'bg-indigo-100 text-indigo-800 border-indigo-200 animate-pulse';
      case 'error': case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted': return 'Publié'; case 'scheduled': return 'Planifié'; case 'pending': return 'Brouillon';
      case 'rendered': return 'Prêt'; case 'processing': return 'En cours'; case 'error': case 'failed': return 'Échec';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">File d'attente</h1>
          <p className="text-slate-500">Gérez, planifiez et surveillez vos pins automatisés.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto max-w-full">
          {['all', 'rendered', 'scheduled', 'processing', 'posted', 'failed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors whitespace-nowrap ${filter === f ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              {getStatusLabel(f)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-4">Contenu</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Tentatives</th>
                <th className="px-6 py-4">Programmation</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-12 flex-shrink-0 rounded-md bg-slate-100 overflow-hidden border border-slate-200">
                        <img src={item.image_path || item.asset_9x16_path || item.asset_4x5_path} alt={item.pin_title} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.pin_title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">Board: {item.board_slug}</p>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 mt-2 inline-block">{item.platform}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>{getStatusLabel(item.status)}</span>
                    {(item.error_message || item.publish_error) && <p className="text-xs text-red-500 mt-1 max-w-[200px] break-words">{item.publish_error || item.error_message}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.attempts}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {item.status === 'posted' ? <span>{new Date(item.published_at!).toLocaleDateString('fr-FR')}</span>
                        : item.scheduled_at ? <span>{new Date(item.scheduled_at).toLocaleDateString('fr-FR')} <span className="text-xs text-slate-400">{new Date(item.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></span>
                        : <span className="text-slate-400 italic">Non planifié</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {processingId === item.id ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : (
                        <>
                          {['failed', 'error', 'rendered'].includes(item.status) && <button onClick={() => handleForcePublish(item)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md" title="Publier"><Play className="w-4 h-4" /></button>}
                          {['failed', 'error'].includes(item.status) && <button onClick={() => handleRetry(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md" title="Retry"><RefreshCw className="w-4 h-4" /></button>}
                          {item.status === 'posted' && item.external_post_url && <a href={item.external_post_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md"><ExternalLink className="w-4 h-4" /></a>}
                          <button onClick={() => setItemToEdit(item)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => setItemToDelete(item)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AutomationModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Confirmer la suppression"
        footer={<><button onClick={() => setItemToDelete(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Annuler</button><button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Supprimer</button></>}>
        <p className="text-slate-600">Êtes-vous sûr de vouloir supprimer <strong>{itemToDelete?.pin_title}</strong> ?</p>
      </AutomationModal>

      <AutomationModal isOpen={!!itemToEdit} onClose={() => setItemToEdit(null)} title="Modifier le Pin">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Titre du Pin</label><input type="text" required className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm" value={itemToEdit?.pin_title || ''} onChange={e => setItemToEdit(prev => prev ? { ...prev, pin_title: e.target.value } : null)} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea rows={3} className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm" value={itemToEdit?.pin_description || ''} onChange={e => setItemToEdit(prev => prev ? { ...prev, pin_description: e.target.value } : null)} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">URL de destination</label><input type="url" required className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm" value={itemToEdit?.destination_url || ''} onChange={e => setItemToEdit(prev => prev ? { ...prev, destination_url: e.target.value } : null)} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Date de publication</label><input type="datetime-local" className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm" value={itemToEdit?.scheduled_at ? new Date(itemToEdit.scheduled_at).toISOString().slice(0, 16) : ''} onChange={e => setItemToEdit(prev => prev ? { ...prev, scheduled_at: new Date(e.target.value).toISOString() } : null)} /></div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setItemToEdit(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Annuler</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Enregistrer</button>
          </div>
        </form>
      </AutomationModal>
    </div>
  );
};

export default AutomationQueue;

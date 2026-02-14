import React, { useState } from 'react';
import { useAutomationStore } from '@/components/automation/AutomationStore';
import { useAutomationToast } from '@/components/automation/AutomationToast';
import { Save, Plus, Map, Check, X } from 'lucide-react';

const AutomationBoardMapping: React.FC = () => {
  const { boards, toggleBoardActive, addBoard } = useAutomationStore();
  const { addToast } = useAutomationToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newBoard, setNewBoard] = useState({ cuisine_key: '', board_slug: '', board_name: '', pinterest_board_id: '12345', is_active: true });

  const handleToggle = async (id: string, current: boolean) => {
    await toggleBoardActive(id, !current);
    addToast(current ? "Tableau désactivé" : "Tableau activé", "info");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoard.cuisine_key || !newBoard.board_slug) { addToast("Veuillez remplir tous les champs", "error"); return; }
    try {
      await addBoard(newBoard);
      addToast("Nouveau mapping ajouté !", "success");
      setIsAdding(false);
      setNewBoard({ cuisine_key: '', board_slug: '', board_name: '', pinterest_board_id: '12345', is_active: true });
    } catch { addToast("Erreur lors de l'ajout", "error"); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Correspondance des Tableaux</h1>
        <p className="text-slate-500">Associez vos types de cuisine à des tableaux Pinterest.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Map className="w-5 h-5 text-emerald-600" /> Mappings Actifs</h2>
          <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? "Annuler" : "Ajouter"}
          </button>
        </div>

        {isAdding && (
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cuisine / Catégorie</label><input type="text" className="w-full rounded-md border-slate-300 shadow-sm sm:text-sm p-2 border" placeholder="ex: Vegan" value={newBoard.cuisine_key} onChange={e => setNewBoard({ ...newBoard, cuisine_key: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nom du Tableau</label><input type="text" className="w-full rounded-md border-slate-300 shadow-sm sm:text-sm p-2 border" placeholder="ex: Recettes Vegan" value={newBoard.board_name} onChange={e => setNewBoard({ ...newBoard, board_name: e.target.value, board_slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} /></div>
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm">Confirmer</button>
            </form>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {boards.map(board => (
            <div key={board.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Cuisine</label>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-sm font-medium">{board.cuisine_key}</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tableau Pinterest</label>
                  <span className="text-sm text-slate-700">{board.board_name} ({board.board_slug})</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => handleToggle(board.id, board.is_active)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${board.is_active ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${board.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-medium text-slate-700 w-12">{board.is_active ? 'Actif' : 'Pause'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="bg-blue-100 p-2 rounded-lg h-fit"><Check className="w-5 h-5 text-blue-600" /></div>
          <div>
            <h3 className="font-semibold text-blue-900">Comment ça marche</h3>
            <p className="text-sm text-blue-700 mt-1 leading-relaxed">Lorsqu'une nouvelle recette est publiée, le système vérifie son type de cuisine. S'il correspond à une clé ci-dessus, un pin est automatiquement créé et assigné au tableau Pinterest correspondant.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationBoardMapping;

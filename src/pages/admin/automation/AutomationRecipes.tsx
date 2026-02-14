import React, { useRef, useState } from 'react';
import { useAutomationStore } from '@/components/automation/AutomationStore';
import { useAutomationToast } from '@/components/automation/AutomationToast';
import { AutomationRecipe } from '@/components/automation/AutomationTypes';
import { Plus, MoreHorizontal, Upload } from 'lucide-react';
import AutomationModal from '@/components/automation/AutomationModal';

const AutomationRecipes: React.FC = () => {
  const { recipes, loading, addToQueue, addRecipe } = useAutomationStore();
  const { addToast } = useAutomationToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newRecipe, setNewRecipe] = useState({ title: '', cuisine_type: '', image_url: 'https://picsum.photos/400/600', ingredients_count: 5, badges: [] as string[] });

  const handleAddToQueue = async (recipe: AutomationRecipe) => {
    try { await addToQueue(recipe); addToast(`${recipe.title} ajouté à la file !`, "success"); } catch { addToast("Erreur lors de l'ajout.", "error"); }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addRecipe({ ...newRecipe, badges: ['Nouveau'] });
      addToast("Recette créée", "success");
      setIsAdding(false);
      setNewRecipe({ title: '', cuisine_type: '', image_url: 'https://picsum.photos/400/600', ingredients_count: 5, badges: [] });
    } catch { addToast("Erreur lors de la création", "error"); }
  };

  if (loading && recipes.length === 0) return <div className="p-8 text-center text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recettes</h1>
          <p className="text-slate-500">Importées depuis votre base de données NutriZen.</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.json" onChange={() => {}} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"><Upload className="w-4 h-4" /> Importer CSV</button>
          <button onClick={() => setIsAdding(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Nouvelle Recette</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recipes.map(recipe => (
          <div key={recipe.id} className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-[4/3] w-full overflow-hidden relative">
              <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute top-2 right-2"><span className="bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-2 py-1 rounded shadow-sm">{recipe.cuisine_type}</span></div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-slate-900 line-clamp-1">{recipe.title}</h3>
              <div className="flex flex-wrap gap-1 mt-2 mb-4">
                {recipe.badges.slice(0, 3).map(badge => <span key={badge} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{badge}</span>)}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-400">{recipe.ingredients_count} ingrédients</span>
                <div className="flex gap-2">
                  <button onClick={() => handleAddToQueue(recipe)} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded transition-colors">Créer Pin</button>
                  <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AutomationModal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Ajouter une nouvelle recette">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Titre</label><input type="text" required className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm" value={newRecipe.title} onChange={e => setNewRecipe({ ...newRecipe, title: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Type de Cuisine</label><input type="text" required className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm" value={newRecipe.cuisine_type} onChange={e => setNewRecipe({ ...newRecipe, cuisine_type: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">URL Image</label><input type="url" required className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm" value={newRecipe.image_url} onChange={e => setNewRecipe({ ...newRecipe, image_url: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre d'ingrédients</label><input type="number" required min="1" className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm" value={newRecipe.ingredients_count} onChange={e => setNewRecipe({ ...newRecipe, ingredients_count: parseInt(e.target.value) })} /></div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Annuler</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Créer</button>
          </div>
        </form>
      </AutomationModal>
    </div>
  );
};

export default AutomationRecipes;

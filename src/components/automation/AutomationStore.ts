import { create } from 'zustand';
import { AutomationRecipe, SocialQueueItem, PinterestBoardMap, AutomationSettings, isValidPlatform } from './AutomationTypes';
import { automationApi } from './AutomationApi';

interface AutomationState {
  recipes: AutomationRecipe[];
  queue: SocialQueueItem[];
  boards: PinterestBoardMap[];
  settings: AutomationSettings | null;
  loading: boolean;
  fetchInitialData: () => Promise<void>;
  addRecipe: (recipe: Omit<AutomationRecipe, 'id' | 'created_at'>) => Promise<void>;
  addToQueue: (recipe: AutomationRecipe, platform?: string) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  updateQueueItem: (id: string, updates: Partial<SocialQueueItem>) => Promise<void>;
  retryPublishItem: (id: string) => Promise<void>;
  addBoard: (board: Omit<PinterestBoardMap, 'id'>) => Promise<void>;
  toggleBoardActive: (id: string, isActive: boolean) => Promise<void>;
  saveSettings: (settings: AutomationSettings) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  recipes: [],
  queue: [],
  boards: [],
  settings: null,
  loading: false,

  fetchInitialData: async () => {
    set({ loading: true });
    try {
      const [recipes, queue, boards, settings] = await Promise.all([
        automationApi.getRecipes(),
        automationApi.getQueue(),
        automationApi.getBoards(),
        automationApi.getSettings(),
      ]);
      set({ recipes, queue, boards, settings, loading: false });
    } catch (e) {
      console.error("Erreur chargement données automation:", e);
      set({ loading: false });
    }
  },

  addRecipe: async (recipe) => {
    const newRecipe = await automationApi.addRecipe(recipe);
    set(state => ({ recipes: [newRecipe, ...state.recipes] }));
  },

  addToQueue: async (recipe, platform = 'Pinterest') => {
    const defaultBoard = get().boards.find(b => b.cuisine_key === recipe.cuisine_type)?.board_slug || 'general';
    const safePlatform = isValidPlatform(platform) ? platform : 'Pinterest';
    const newItem = await automationApi.addToQueue({
      recipe_id: recipe.id,
      recipe_title: recipe.title,
      image_path: recipe.image_url,
      asset_9x16_path: recipe.image_url,
      platform: safePlatform,
      pin_title: recipe.title,
      pin_description: `Découvrez ce délicieux ${recipe.title}. Recette complète sur NutriZen !`,
      board_slug: defaultBoard,
      destination_url: `https://nutrizen.app/r/${recipe.id}`,
      status: 'rendered',
      attempts: 0,
    });
    set(state => ({ queue: [newItem, ...state.queue] }));
  },

  removeFromQueue: async (id) => {
    await automationApi.removeFromQueue(id);
    set(state => ({ queue: state.queue.filter(i => i.id !== id) }));
  },

  updateQueueItem: async (id, updates) => {
    set(state => ({ queue: state.queue.map(i => i.id === id ? { ...i, ...updates } : i) }));
    await automationApi.updateQueueItem(id, updates);
  },

  retryPublishItem: async (id) => {
    set(state => ({ queue: state.queue.map(i => i.id === id ? { ...i, status: 'rendered', publish_error: undefined } : i) }));
    await automationApi.updateQueueItem(id, { status: 'rendered', publish_error: undefined, attempts: 0, locked_at: undefined, scheduled_at: new Date().toISOString() } as any);
  },

  addBoard: async (boardData) => {
    const newBoard = await automationApi.addBoard(boardData);
    set(state => ({ boards: [...state.boards, newBoard] }));
  },

  toggleBoardActive: async (id, isActive) => {
    set(state => ({ boards: state.boards.map(b => b.id === id ? { ...b, is_active: isActive } : b) }));
    await automationApi.updateBoard(id, { is_active: isActive });
  },

  saveSettings: async (settings) => {
    const saved = await automationApi.saveSettings(settings);
    set({ settings: saved });
  },
}));

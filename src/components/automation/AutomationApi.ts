import { supabase } from '@/integrations/supabase/client';
import { AutomationRecipe, SocialQueueItem, PinterestBoardMap, AutomationSettings } from './AutomationTypes';
import { MOCK_RECIPES, MOCK_QUEUE, MOCK_BOARDS } from './AutomationConstants';

// Check if tables exist by attempting a query
let usesMock = false;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock implementation for when tables don't exist yet
const DEFAULT_SETTINGS: AutomationSettings = {
  timezone: 'Europe/Paris',
  language: 'fr',
  supabaseUrl: '',
  pinterestAppId: '',
  pinterestToken: '',
  cloudinaryName: '',
  cloudinaryKey: '',
  googleAnalyticsId: '',
  defaultUtmSource: 'pinterest',
};

class MockService {
  private recipes: AutomationRecipe[] = [...MOCK_RECIPES];
  private queue: SocialQueueItem[] = [...MOCK_QUEUE];
  private boards: PinterestBoardMap[] = [...MOCK_BOARDS];
  private settings: AutomationSettings = { ...DEFAULT_SETTINGS };

  async getRecipes() { await delay(200); return this.recipes; }
  async addRecipe(recipe: Omit<AutomationRecipe, 'id' | 'created_at'>): Promise<AutomationRecipe> {
    await delay(200);
    const newRecipe: AutomationRecipe = { ...recipe, id: `r-${Date.now()}`, created_at: new Date().toISOString() };
    this.recipes = [newRecipe, ...this.recipes];
    return newRecipe;
  }
  async getQueue() { await delay(200); return this.queue; }
  async addToQueue(item: Partial<SocialQueueItem>): Promise<SocialQueueItem> {
    await delay(200);
    const newItem: SocialQueueItem = {
      id: `q-${Date.now()}`,
      recipe_id: item.recipe_id || '',
      recipe_title: item.recipe_title || '',
      image_path: item.image_path || '',
      platform: item.platform || 'Pinterest',
      status: item.status || 'pending',
      pin_title: item.pin_title || '',
      pin_description: item.pin_description || '',
      board_slug: item.board_slug || '',
      destination_url: item.destination_url || '',
      attempts: item.attempts || 0,
      utm_stats: { clicks: 0, impressions: 0, saves: 0 },
    };
    this.queue = [newItem, ...this.queue];
    return newItem;
  }
  async updateQueueItem(id: string, updates: Partial<SocialQueueItem>): Promise<SocialQueueItem> {
    await delay(200);
    this.queue = this.queue.map(i => i.id === id ? { ...i, ...updates } as SocialQueueItem : i);
    return this.queue.find(i => i.id === id)!;
  }
  async removeFromQueue(id: string) { await delay(200); this.queue = this.queue.filter(i => i.id !== id); }
  async getBoards() { await delay(200); return this.boards; }
  async addBoard(board: Partial<PinterestBoardMap>): Promise<PinterestBoardMap> {
    await delay(200);
    const newBoard: PinterestBoardMap = {
      id: `b-${Date.now()}`,
      cuisine_key: board.cuisine_key || '',
      board_slug: board.board_slug || '',
      board_name: board.board_name || '',
      pinterest_board_id: board.pinterest_board_id || '',
      is_active: board.is_active ?? true,
    };
    this.boards = [...this.boards, newBoard];
    return newBoard;
  }
  async updateBoard(id: string, updates: Partial<PinterestBoardMap>) {
    await delay(200);
    this.boards = this.boards.map(b => b.id === id ? { ...b, ...updates } as PinterestBoardMap : b);
  }
  async getSettings() { await delay(200); return this.settings; }
  async saveSettings(s: AutomationSettings) { await delay(200); this.settings = s; return s; }
}

const mockService = new MockService();

// Real Supabase API
const supabaseApi = {
  async getRecipes(): Promise<AutomationRecipe[]> {
    const { data, error } = await supabase.from('recipes').select('id, title, cuisine_type, badges, image_url, created_at').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return (data || []).map((r: any) => ({ ...r, ingredients_count: 0 }));
  },
  async addRecipe(recipe: Omit<AutomationRecipe, 'id' | 'created_at'>): Promise<AutomationRecipe> {
    const { data, error } = await supabase.from('recipes').insert({ title: recipe.title, cuisine_type: recipe.cuisine_type, badges: recipe.badges, image_url: recipe.image_url, source_name: 'automation' }).select().single();
    if (error) throw error;
    return { ...data, ingredients_count: recipe.ingredients_count } as unknown as AutomationRecipe;
  },
  async getQueue(): Promise<SocialQueueItem[]> {
    const { data, error } = await supabase.from('social_queue').select('*').order('created_at', { ascending: false });
    if (error) { usesMock = true; return mockService.getQueue(); }
    return (data || []).map((item: any) => ({
      ...item,
      image_path: item.image_path || item.asset_9x16_path || item.asset_4x5_path || '',
      utm_stats: item.utm_stats || { clicks: 0, impressions: 0, saves: 0 },
    }));
  },
  async addToQueue(item: Partial<SocialQueueItem>): Promise<SocialQueueItem> {
    const row = { recipe_id: item.recipe_id || '', title: item.pin_title || item.recipe_title || '', pin_title: item.pin_title || '', pin_description: item.pin_description || '', board_slug: item.board_slug || '', destination_url: item.destination_url || '', image_path: item.image_path || '', asset_9x16_path: item.asset_9x16_path || '', status: 'rendered' as const, platform: 'pinterest' as const, attempts: 0 };
    const { data, error } = await supabase.from('social_queue').insert(row).select().single();
    if (error) throw error;
    return data as unknown as SocialQueueItem;
  },
  async updateQueueItem(id: string, updates: Partial<SocialQueueItem>): Promise<SocialQueueItem> {
    const { data, error } = await supabase.from('social_queue').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as unknown as SocialQueueItem;
  },
  async removeFromQueue(id: string) {
    const { error } = await supabase.from('social_queue').delete().eq('id', id);
    if (error) throw error;
  },
  async getBoards(): Promise<PinterestBoardMap[]> {
    const { data, error } = await supabase.from('pinterest_board_map').select('*').order('board_slug');
    if (error) { usesMock = true; return mockService.getBoards(); }
    return (data || []) as unknown as PinterestBoardMap[];
  },
  async addBoard(board: Partial<PinterestBoardMap>): Promise<PinterestBoardMap> {
    const row = { cuisine_key: board.cuisine_key || '', board_slug: board.board_slug || '', destination_path: `/${board.board_slug || ''}`, is_active: board.is_active ?? true, pinterest_board_id: board.pinterest_board_id || null };
    const { data, error } = await supabase.from('pinterest_board_map').insert(row).select().single();
    if (error) throw error;
    return data as unknown as PinterestBoardMap;
  },
  async updateBoard(id: string, updates: Partial<PinterestBoardMap>) {
    const { error } = await supabase.from('pinterest_board_map').update(updates).eq('cuisine_key', id);
    if (error) throw error;
  },
  async getSettings(): Promise<AutomationSettings> {
    const { data: authData } = await supabase.from('pinterest_oauth').select('expires_at, account_label, scope').eq('account_label', 'main').maybeSingle();
    return {
      ...DEFAULT_SETTINGS,
      pinterestConnected: !!authData,
      pinterestTokenExpiresAt: authData?.expires_at || undefined,
    };
  },
  async saveSettings(settings: AutomationSettings): Promise<AutomationSettings> {
    return settings;
  },
};

// Export an API that tries supabase first, falls back to mock
export const automationApi = {
  getRecipes: async () => { try { return await supabaseApi.getRecipes(); } catch { return mockService.getRecipes(); } },
  addRecipe: async (r: Omit<AutomationRecipe, 'id' | 'created_at'>) => { try { return await supabaseApi.addRecipe(r); } catch { return mockService.addRecipe(r); } },
  getQueue: async () => { try { return await supabaseApi.getQueue(); } catch { return mockService.getQueue(); } },
  addToQueue: async (item: Partial<SocialQueueItem>) => { try { return await supabaseApi.addToQueue(item); } catch { return mockService.addToQueue(item); } },
  updateQueueItem: async (id: string, updates: Partial<SocialQueueItem>) => { try { return await supabaseApi.updateQueueItem(id, updates); } catch { return mockService.updateQueueItem(id, updates); } },
  removeFromQueue: async (id: string) => { try { return await supabaseApi.removeFromQueue(id); } catch { return mockService.removeFromQueue(id); } },
  getBoards: async () => { try { return await supabaseApi.getBoards(); } catch { return mockService.getBoards(); } },
  addBoard: async (board: Partial<PinterestBoardMap>) => { try { return await supabaseApi.addBoard(board); } catch { return mockService.addBoard(board); } },
  updateBoard: async (id: string, updates: Partial<PinterestBoardMap>) => { try { return await supabaseApi.updateBoard(id, updates); } catch { return mockService.updateBoard(id, updates); } },
  getSettings: async () => { try { return await supabaseApi.getSettings(); } catch { return mockService.getSettings(); } },
  saveSettings: async (s: AutomationSettings) => { try { return await supabaseApi.saveSettings(s); } catch { return mockService.saveSettings(s); } },
};

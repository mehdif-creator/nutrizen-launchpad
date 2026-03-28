import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PostStatus = 'ready' | 'posted' | 'archived';

export interface ManualSocialPost {
  id: string;
  queue_id: string | null;
  recipe_id: string | null;
  title: string | null;
  description: string | null;
  image_9x16_url: string | null;
  image_4x5_url: string | null;
  platform_target: string | null;
  status: PostStatus;
  source_workflow: string | null;
  created_at: string;
  posted_at: string | null;
  notes: string | null;
  website_url: string | null;
  board_slug: string | null;
  board_name: string | null;
  cuisine_type: string | null;
  board_priority: number | null;
  ingredients_json: unknown | null;
  ingredients_text: string | null;
  preparation_steps_json: unknown | null;
  preparation_steps_text: string | null;
}

export function getBoardName(post: ManualSocialPost): string {
  return post.board_name || post.board_slug || 'Non classé';
}

export function getBoardSlug(post: ManualSocialPost): string {
  return post.board_slug || 'non-classe';
}

const DEFAULT_DESCRIPTION_TEMPLATE = (url: string) =>
  `Découvrez cette recette et bien plus encore sur NutriZen : ${url}`;

export function getDefaultDescription(post: ManualSocialPost): string {
  return DEFAULT_DESCRIPTION_TEMPLATE(post.website_url || 'https://mynutrizen.fr/');
}

export function getEffectiveDescription(post: ManualSocialPost): string {
  return post.description || getDefaultDescription(post);
}

interface Filters {
  search: string;
  status: PostStatus | 'all';
  platform: string;
  board: string;
}

export interface BoardCount {
  board_slug: string;
  board_name: string;
  count: number;
}

export function useManualSocialPosts() {
  const [allPosts, setAllPosts] = useState<ManualSocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', platform: 'all', board: 'all' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortLeastFed, setSortLeastFed] = useState(false);
  const { toast } = useToast();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('manual_social_posts' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setAllPosts((data as unknown as ManualSocialPost[]) || []);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
      toast({ title: 'Erreur', description: 'Impossible de charger les posts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Distinct boards for filter dropdown
  const distinctBoards = useMemo(() => {
    const map = new Map<string, string>();
    allPosts.forEach(p => {
      const slug = getBoardSlug(p);
      const name = getBoardName(p);
      if (!map.has(slug)) map.set(slug, name);
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPosts]);

  // Board distribution: only ready posts, grouped, sorted ascending
  const boardDistribution = useMemo<BoardCount[]>(() => {
    const map = new Map<string, { board_name: string; count: number }>();
    allPosts.filter(p => p.status === 'ready').forEach(p => {
      const slug = getBoardSlug(p);
      const name = getBoardName(p);
      const entry = map.get(slug);
      if (entry) {
        entry.count++;
      } else {
        map.set(slug, { board_name: name, count: 0 + 1 });
      }
    });
    return Array.from(map.entries())
      .map(([board_slug, v]) => ({ board_slug, board_name: v.board_name, count: v.count }))
      .sort((a, b) => a.count - b.count);
  }, [allPosts]);

  // Build a slug→count lookup for sorting
  const boardCountMap = useMemo(() => {
    const m = new Map<string, number>();
    boardDistribution.forEach(b => m.set(b.board_slug, b.count));
    return m;
  }, [boardDistribution]);

  // Filter posts client-side
  const posts = useMemo(() => {
    let filtered = allPosts.filter(p => {
      if (filters.status !== 'all' && p.status !== filters.status) return false;
      if (filters.platform !== 'all' && p.platform_target !== filters.platform) return false;
      if (filters.board !== 'all' && getBoardSlug(p) !== filters.board) return false;
      if (filters.search.trim() && !(p.title || '').toLowerCase().includes(filters.search.trim().toLowerCase())) return false;
      return true;
    });

    if (sortLeastFed) {
      filtered = [...filtered].sort((a, b) => {
        const ca = boardCountMap.get(getBoardSlug(a)) ?? 0;
        const cb = boardCountMap.get(getBoardSlug(b)) ?? 0;
        return ca - cb;
      });
    }

    return filtered;
  }, [allPosts, filters, sortLeastFed, boardCountMap]);

  const updatePost = useCallback(async (id: string, updates: Partial<ManualSocialPost>) => {
    try {
      const { error: err } = await supabase
        .from('manual_social_posts' as any)
        .update(updates as any)
        .eq('id', id);
      if (err) throw err;
      setAllPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } as ManualSocialPost : p));
      return true;
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Mise à jour échouée', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const markAsPosted = useCallback(async (id: string) => {
    const ok = await updatePost(id, { status: 'posted', posted_at: new Date().toISOString() } as any);
    if (ok) toast({ title: 'Succès', description: 'Post marqué comme publié' });
    return ok;
  }, [updatePost, toast]);

  const archivePost = useCallback(async (id: string) => {
    const ok = await updatePost(id, { status: 'archived' } as any);
    if (ok) toast({ title: 'Succès', description: 'Post archivé' });
    return ok;
  }, [updatePost, toast]);

  const restorePost = useCallback(async (id: string) => {
    const ok = await updatePost(id, { status: 'ready' } as any);
    if (ok) toast({ title: 'Succès', description: 'Post remis en prêt' });
    return ok;
  }, [updatePost, toast]);

  const updateNotes = useCallback(async (id: string, notes: string) => {
    const ok = await updatePost(id, { notes } as any);
    if (ok) toast({ title: 'Succès', description: 'Notes mises à jour' });
    return ok;
  }, [updatePost, toast]);

  const generateDefaultDescription = useCallback(async (post: ManualSocialPost) => {
    const desc = getDefaultDescription(post);
    const ok = await updatePost(post.id, { description: desc } as any);
    if (ok) toast({ title: 'Succès', description: 'Description générée' });
    return ok;
  }, [updatePost, toast]);

  const selectedPost = allPosts.find(p => p.id === selectedId) || null;

  const counts = {
    ready: allPosts.filter(p => p.status === 'ready').length,
    posted: allPosts.filter(p => p.status === 'posted').length,
    archived: allPosts.filter(p => p.status === 'archived').length,
    total: allPosts.length,
  };

  return {
    posts,
    loading,
    error,
    filters,
    setFilters,
    selectedPost,
    selectedId,
    setSelectedId,
    fetchPosts,
    markAsPosted,
    archivePost,
    restorePost,
    updateNotes,
    generateDefaultDescription,
    counts,
    distinctBoards,
    boardDistribution,
    sortLeastFed,
    setSortLeastFed,
  };
}

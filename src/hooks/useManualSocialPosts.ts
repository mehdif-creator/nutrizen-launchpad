import { useState, useEffect, useCallback } from 'react';
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
}

export function useManualSocialPosts() {
  const [allPosts, setAllPosts] = useState<ManualSocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', platform: 'all' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Filter posts client-side so counters reflect global totals
  const posts = allPosts.filter(p => {
    if (filters.status !== 'all' && p.status !== filters.status) return false;
    if (filters.platform !== 'all' && p.platform_target !== filters.platform) return false;
    if (filters.search.trim() && !(p.title || '').toLowerCase().includes(filters.search.trim().toLowerCase())) return false;
    return true;
  });

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

  // Counters reflect global totals, not filtered results
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
  };
}

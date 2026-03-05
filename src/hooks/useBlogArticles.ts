import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  tags: string[] | null;
  published_at: string | null;
  content: string | null;
  author: string | null;
  // SEO Factory fields
  cluster_context: string | null;
  outline: any | null;
  image_urls: any | null;
  draft_html: string | null;
  draft_meta: any | null;
  schema_json: any | null;
  qa_score: number | null;
  source: 'manual' | 'seo_factory';
}

function mapSeoArticle(a: any): BlogArticle {
  const outline = a.outline as any;
  const images = a.image_urls as any[];
  return {
    id: a.id,
    slug: outline?.slug || a.keyword?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || a.id,
    title: outline?.title || outline?.h1 || a.keyword,
    excerpt: outline?.excerpt || null,
    cover_url: images?.[0]?.url || images?.[0] || null,
    tags: a.cluster_context ? [a.cluster_context] : null,
    published_at: a.created_at,
    content: a.draft_html,
    author: 'NutriZen',
    cluster_context: a.cluster_context,
    outline: a.outline,
    image_urls: a.image_urls,
    draft_html: a.draft_html,
    draft_meta: a.draft_meta,
    schema_json: a.schema_json,
    qa_score: a.qa_score,
    source: 'seo_factory',
  };
}

function mapBlogPost(p: any): BlogArticle {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover_url: p.cover_url,
    tags: p.tags,
    published_at: p.published_at || p.created_at,
    content: p.content,
    author: p.author,
    cluster_context: null,
    outline: null,
    image_urls: null,
    draft_html: null,
    draft_meta: null,
    schema_json: null,
    qa_score: null,
    source: 'manual',
  };
}

export function useBlogArticles() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const [manualRes, seoRes] = await Promise.all([
        supabase.from('blog_posts').select('*').not('published_at', 'is', null),
        supabase.from('seo_articles').select('*').eq('status', 'published' as any),
      ]);

      const manual = (manualRes.data || []).map(mapBlogPost);
      const seo = (seoRes.data || []).map(mapSeoArticle);
      const all = [...manual, ...seo].sort(
        (a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
      );
      setArticles(all);
      setLoading(false);
    }
    fetch();
  }, []);

  return { articles, loading };
}

export function useBlogArticleBySlug(slug: string | undefined) {
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<BlogArticle[]>([]);
  const [validSlugs, setValidSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function fetch() {
      // Try blog_posts first
      const { data: manual } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (manual) {
        setArticle(mapBlogPost(manual));
      } else {
        // Try seo_articles - match by outline->slug or keyword-derived slug
        const { data: seoList } = await supabase
          .from('seo_articles')
          .select('*')
          .eq('status', 'published' as any);

        const match = (seoList || []).find((a: any) => {
          const o = a.outline as any;
          const derivedSlug = o?.slug || a.keyword?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          return derivedSlug === slug;
        });

        if (match) {
          setArticle(mapSeoArticle(match));
        }
      }

      // Fetch related articles (3 most recent published SEO articles, excluding current)
      const { data: relatedSeo } = await supabase
        .from('seo_articles')
        .select('*')
        .eq('status', 'published' as any)
        .order('published_at', { ascending: false })
        .limit(10);

      const { data: relatedManual } = await supabase
        .from('blog_posts')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(10);

      const allMapped = [
        ...(relatedManual || []).map(mapBlogPost),
        ...(relatedSeo || []).map(mapSeoArticle),
      ];

      // Build set of all valid published slugs
      const slugSet = new Set(allMapped.map(a => a.slug).filter(Boolean));
      setValidSlugs(slugSet);

      const allRelated = allMapped
        .filter(a => a.slug !== slug)
        .sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime())
        .slice(0, 3);

      setRelatedArticles(allRelated);
      setLoading(false);
    }
    fetch();
  }, [slug]);

  return { article, relatedArticles, validSlugs, loading };
}

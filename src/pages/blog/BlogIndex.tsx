import { useState, useMemo, useCallback, useEffect } from 'react';
// Fix 3: useState needed for image error fallback in ArticleCard
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlogArticles, BlogArticle } from '@/hooks/useBlogArticles';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { Search, X } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categoryMapping';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function highlightText(text: string, query: string): string {
  if (!query.trim() || !text) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 rounded-sm px-0.5">$1</mark>');
}

function getReadingTime(article: BlogArticle): number {
  return parseInt(article.outline?.reading_time_minutes || '5', 10);
}

function getTitle(article: BlogArticle): string {
  return article.outline?.title || article.title || '';
}

function getExcerpt(article: BlogArticle): string {
  return article.outline?.excerpt || article.excerpt || '';
}

export default function BlogIndex() {
  const { user } = useAuth();
  const { articles, loading } = useBlogArticles();
  const [searchParams, setSearchParams] = useSearchParams();

  // State from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categorie') || 'Tous');
  const [readingTimeFilter, setReadingTimeFilter] = useState(searchParams.get('duree') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('tri') || 'recent');

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (selectedCategory && selectedCategory !== 'Tous') params.set('categorie', selectedCategory);
    if (readingTimeFilter) params.set('duree', readingTimeFilter);
    if (sortBy && sortBy !== 'recent') params.set('tri', sortBy);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, selectedCategory, readingTimeFilter, sortBy, setSearchParams]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach(a => {
      const c = getCategoryLabel(a.cluster_context || a.tags?.[0]);
      if (c) cats.add(c);
    });
    return ['Tous', ...Array.from(cats).sort((a, b) => a.localeCompare(b, 'fr'))];
  }, [articles]);

  // Combined filtering + sorting
  const filteredArticles = useMemo(() => {
    let result = [...articles];

    // 1. Text search
    if (debouncedQuery.trim()) {
      const q = normalize(debouncedQuery);
      result = result.filter(a => {
        const fields = [
          getTitle(a),
          getExcerpt(a),
          a.outline?.meta_description,
          (a as any).keyword,
          a.cluster_context,
        ].filter(Boolean).join(' ');
        return normalize(fields).includes(q);
      });
    }

    // 2. Category
    if (selectedCategory && selectedCategory !== 'Tous') {
      result = result.filter(a =>
        getCategoryLabel(a.cluster_context || a.tags?.[0]) === selectedCategory
      );
    }

    // 3. Reading time
    if (readingTimeFilter) {
      result = result.filter(a => {
        const t = getReadingTime(a);
        if (readingTimeFilter === 'short') return t <= 3;
        if (readingTimeFilter === 'medium') return t > 3 && t <= 7;
        if (readingTimeFilter === 'long') return t > 7;
        return true;
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortBy === 'oldest')
        return new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime();
      if (sortBy === 'score')
        return (b.qa_score || 0) - (a.qa_score || 0);
      if (sortBy === 'az')
        return getTitle(a).localeCompare(getTitle(b), 'fr');
      return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
    });

    return result;
  }, [articles, debouncedQuery, selectedCategory, readingTimeFilter, sortBy]);

  const hasActiveFilters = debouncedQuery.trim() !== '' || selectedCategory !== 'Tous' || readingTimeFilter !== '';

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('Tous');
    setReadingTimeFilter('');
    setSortBy('recent');
  }, []);

  useSeoMeta(
    'Blog NutriZen — Conseils nutrition & recettes healthy',
    'Découvrez nos articles nutrition, astuces cuisine et guides pratiques pour manger sainement au quotidien.'
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {user ? <AppHeader /> : <Header onCtaClick={() => {}} />}

      <main className="flex-1 container py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 text-foreground">Blog NutriZen</h1>
            <p className="text-lg text-muted-foreground">
              Conseils nutrition, astuces cuisine et guides pratiques
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-[600px] mx-auto mb-8 relative">
            <input
              type="text"
              placeholder="Rechercher un article, une recette, un conseil..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full py-4 pl-5 pr-12 text-base border-2 border-border rounded-full bg-background text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
            />
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10 px-4">
            {/* Category pills */}
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all cursor-pointer
                  ${selectedCategory === cat
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-border text-foreground hover:bg-secondary hover:border-primary/40'
                  }`}
              >
                {cat}
              </button>
            ))}

            {/* Separator */}
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

            {/* Reading time */}
            <select
              value={readingTimeFilter}
              onChange={e => setReadingTimeFilter(e.target.value)}
              className="px-4 py-2 border-2 border-border rounded-full bg-background text-sm text-foreground cursor-pointer outline-none appearance-none pr-8 hover:border-primary/40 transition-colors"
            >
              <option value="">⏱ Durée</option>
              <option value="short">≤ 3 min</option>
              <option value="medium">3 – 7 min</option>
              <option value="long">&gt; 7 min</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-4 py-2 border-2 border-border rounded-full bg-background text-sm text-foreground cursor-pointer outline-none appearance-none pr-8 hover:border-primary/40 transition-colors"
            >
              <option value="recent">📅 Récents</option>
              <option value="oldest">📅 Anciens</option>
              <option value="score">⭐ Score SEO</option>
              <option value="az">🔤 A → Z</option>
            </select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground border border-border rounded-full hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Effacer
              </button>
            )}

            {/* Count */}
            {!loading && (
              <span className="text-sm text-muted-foreground ml-auto">
                {filteredArticles.length} article{filteredArticles.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            /* Empty state */
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Aucun article trouvé
              </h3>
              <p className="text-muted-foreground mb-6">
                Essayez avec d'autres mots-clés ou une autre catégorie.
              </p>
              <button
                onClick={resetAllFilters}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            /* Article grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  searchQuery={debouncedQuery}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {user ? <AppFooter /> : <Footer />}
    </div>
  );
}

function parseImageUrls(raw: unknown): { url: string; alt: string; type: string }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

const categoryGradients: Record<string, string> = {
  'Nutrition': 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #86efac 100%)',
  'Recettes': 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
  'Sport': 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
  'Bien-être': 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%)',
  'Budget': 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 50%, #c4b5fd 100%)',
};

const categoryEmojis: Record<string, string> = {
  'Nutrition': '🥗',
  'Recettes': '🍳',
  'Sport': '💪',
  'Bien-être': '🧘',
  'Budget': '💡',
};

function ArticleCard({ article, searchQuery }: { article: BlogArticle; searchQuery: string }) {
  const [imgError, setImgError] = useState(false);
  const title = getTitle(article);
  const excerpt = getExcerpt(article);
  const category = getCategoryLabel(article.cluster_context || article.tags?.[0]);
  const readingTime = getReadingTime(article);

  // Fix 1: Parse image_urls safely
  const imageUrls = parseImageUrls(article.image_urls);
  const heroImage = imageUrls.find(img => img.type === 'hero') || imageUrls[0] || null;
  const heroUrl = heroImage?.url || article.cover_url || null;
  const heroAlt = heroImage?.alt || title;
  const hasValidImage = typeof heroUrl === 'string'
    && heroUrl.trim().length > 0
    && !heroUrl.includes('undefined')
    && !heroUrl.includes('null');

  const fallbackGradient = categoryGradients[category] || 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
  const fallbackEmoji = categoryEmojis[category] || '🥦';

  return (
    <Link to={`/blog/${article.slug}`} className="group block">
      <article className="border border-border rounded-2xl overflow-hidden bg-card flex flex-col h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-primary/40">
        {/* Image with fallback */}
        <div
          className="h-[200px] overflow-hidden flex-shrink-0"
          style={{ background: fallbackGradient }}
        >
          {hasValidImage && !imgError ? (
            <img
              src={heroUrl}
              alt={heroAlt}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: fallbackGradient }}>
              <span className="text-5xl">{fallbackEmoji}</span>
              <span className="text-xs font-semibold uppercase tracking-wider opacity-70" style={{ color: '#166534' }}>
                {category}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <span className="inline-block self-start bg-secondary text-primary text-xs font-semibold px-2.5 py-1 rounded-full mb-2.5 uppercase tracking-wide">
            {category}
          </span>

          <h2
            className="text-[1.0625rem] font-bold text-foreground mb-2.5 leading-snug line-clamp-2"
            dangerouslySetInnerHTML={{ __html: highlightText(title, searchQuery) }}
          />

          {excerpt && (
            <p
              className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-3"
              dangerouslySetInnerHTML={{ __html: highlightText(excerpt, searchQuery) }}
            />
          )}

          <div className="flex justify-between items-center pt-3.5 border-t border-border mt-auto">
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>📅 {formatDate(article.published_at)}</span>
              <span>⏱ {readingTime} min</span>
            </div>
            <span className="text-xs text-primary font-semibold">
              Lire →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

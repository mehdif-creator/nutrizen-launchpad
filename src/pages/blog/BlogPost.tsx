import { useParams, Link, Navigate } from 'react-router-dom';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { SocialShareButtons } from '@/components/share/SocialShareButtons';
import { useBlogArticleBySlug, useBlogArticles } from '@/hooks/useBlogArticles';
import { useRef, useState, type SyntheticEvent } from 'react';
import { getCategoryLabel } from '@/lib/categoryMapping';
import DOMPurify from 'isomorphic-dompurify';
import { SeoHead } from '@/components/seo/SeoHead';
import { AuthorBio } from '@/components/blog/AuthorBio';
import { ImmediateAnswer } from '@/components/blog/ImmediateAnswer';
import { ContextualCta } from '@/components/blog/ContextualCta';
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  extractVisibleFaq,
  splitAtMiddleHeading,
} from '@/lib/blog/seo';

const BLOG_FALLBACK_IMAGE = '/img/hero-default.jpg';

function formatDateFr(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function calculateReadTime(content: string): number {
  const wordCount = content
    .replace(/<[^>]*>/g, '')
    .replace(/[#*`_~]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return Math.max(1, Math.round(wordCount / 200));
}

function toSafeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned === 'null' || cleaned === 'undefined') return null;
  return cleaned;
}

function resolveArticleImage(articleLike: {
  cover_url?: unknown;
  image_urls?: unknown;
}): string | null {
  const firstFromArray = Array.isArray(articleLike.image_urls)
    ? typeof articleLike.image_urls[0] === 'string'
      ? articleLike.image_urls[0]
      : (articleLike.image_urls[0] as any)?.url
    : null;

  return toSafeImageUrl(articleLike.cover_url) || toSafeImageUrl(firstFromArray);
}

function withImageFallback(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === 'true') return;
  img.dataset.fallbackApplied = 'true';
  img.src = BLOG_FALLBACK_IMAGE;
}


/** Inject "Pour aller plus loin" links before FAQ section in HTML */
function injectInternalLinks(
  html: string,
  related: ReturnType<typeof useBlogArticleBySlug>['relatedArticles']
): string {
  if (!html || related.length === 0) return html;
  const linksHtml = `
<div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 32px 0;">
  <p style="font-weight: 600; margin: 0 0 12px 0; color: #374151;">📚 Pour aller plus loin :</p>
  <ul style="margin: 0; padding-left: 20px;">
    ${related.map((a) => `<li style="margin-bottom: 8px;"><a href="/blog/${a.slug}" style="color: #16a34a; text-decoration: none; font-weight: 500;">${a.title}</a></li>`).join('')}
  </ul>
</div>`;

  // Try to insert before FAQ section
  const faqIdx = html.toLowerCase().indexOf('<h2');
  const lastH2 = html.lastIndexOf('<h2');
  if (lastH2 > 0) {
    return html.slice(0, lastH2) + linksHtml + html.slice(lastH2);
  }
  return html + linksHtml;
}

export default function BlogPost() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { article, relatedArticles, validSlugs, loading } = useBlogArticleBySlug(slug);
  const { articles: allArticles } = useBlogArticles();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const carouselArticles = allArticles.filter((a) => a.slug !== slug).slice(0, 12);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  // Consolidated duplicate → permanent client-side redirect (mirrors the 301)
  if (article?.redirect_to_slug) {
    return <Navigate to={`/blog/${article.redirect_to_slug}`} replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        {user ? <AppHeader /> : <Header onCtaClick={() => {}} />}
        <main className="flex-1 container py-16">
          <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-80 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        {user ? <AppFooter /> : <Footer />}
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        {user ? <AppHeader /> : <Header onCtaClick={() => {}} />}
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Article introuvable</h1>
          <Link to="/blog">
            <Button variant="outline">Retour au blog</Button>
          </Link>
        </main>
        {user ? <AppFooter /> : <Footer />}
      </div>
    );
  }

  const outline = article.outline as any;
  const h1 = outline?.h1 || article.title;
  const images = Array.isArray(article.image_urls) ? (article.image_urls as any[]) : [];
  const heroImage = resolveArticleImage(article);
  const heroAlt = images?.[0]?.alt || article.title;
  const draftMeta = article.draft_meta as any;
  const faqItems = draftMeta?.faq as { q: string; a: string }[] | undefined;

  // Build the article HTML with placeholders replaced and internal links injected
  const pricingUrl = '/pricing';
  let rawHtml =
    article.source === 'seo_factory'
      ? article.draft_html || article.content || ''
      : article.content || '';

  // --- Sanitize: strip duplicate title at start of body ---
  const titleText = (h1 || article.title || '').trim();
  if (titleText) {
    // Strip leading <h1> or <h2> whose text matches the title
    const titleEscaped = titleText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    rawHtml = rawHtml.replace(
      new RegExp(`^\\s*<(h[12])[^>]*>\\s*${titleEscaped}\\s*<\\/\\1>\\s*`, 'i'),
      ''
    );
  }

  // --- Sanitize: strip ANY leading image at start of body ---
  // Strip leading <figure>...<img>...</figure>
  rawHtml = rawHtml.replace(
    /^\s*<figure[^>]*>\s*<img[^>]*\/?>\s*(?:<figcaption[^>]*>.*?<\/figcaption>\s*)?<\/figure>\s*/is,
    ''
  );
  // Strip leading <p><img></p>
  rawHtml = rawHtml.replace(/^\s*<p>\s*<img[^>]*\/?>\s*<\/p>\s*/i, '');
  // Strip leading standalone <img>
  rawHtml = rawHtml.replace(/^\s*<img[^>]*\/?>\s*/i, '');
  // Strip leading markdown image syntax
  rawHtml = rawHtml.replace(/^\s*!\[.*?\]\(.*?\)\s*/, '');

  // 1. Replace image placeholders with real URLs or inline images
  if (images.length > 0) {
    images.forEach((img: any, index: number) => {
      const n = index + 1;
      const url = toSafeImageUrl(typeof img === 'string' ? img : img?.url);
      const alt = typeof img === 'string' ? article.title : img?.alt || article.title;

      if (!url) {
        rawHtml = rawHtml.split(`{{IMAGE_${n}_URL}}`).join('');
        rawHtml = rawHtml.split(`{{IMAGE_${n}_ALT}}`).join(alt);
        return;
      }

      // Handle templates that already contain src="{{IMAGE_n_URL}}"
      rawHtml = rawHtml.split(`src="{{IMAGE_${n}_URL}}"`).join(`src="${url}"`);
      rawHtml = rawHtml.split(`src='{{IMAGE_${n}_URL}}'`).join(`src="${url}"`);

      // For standalone placeholders in text, inject a proper image block
      const inlineImage = `<figure class="my-6"><img src="${url}" alt="${alt}" loading="lazy" class="w-full rounded-xl object-cover" /></figure>`;
      rawHtml = rawHtml.split(`{{IMAGE_${n}_URL}}`).join(inlineImage);
      rawHtml = rawHtml.split(`{{IMAGE_${n}_ALT}}`).join(alt);
    });
  }
  rawHtml = rawHtml.replace(/\{\{IMAGE_\d+_URL\}\}/g, '');
  rawHtml = rawHtml.replace(/\{\{IMAGE_\d+_ALT\}\}/g, '');

  // 2. Replace ALL CTA URLs with the real pricing page
  rawHtml = rawHtml.split('{{NUTRIZEN_CTA_URL}}').join(pricingUrl);
  rawHtml = rawHtml.split('https://mynutrizen.fr/auth/signup').join(pricingUrl);
  rawHtml = rawHtml.split('https://mynutrizen.fr/signup').join(pricingUrl);
  // Replace bare homepage URLs in href attributes with pricing
  rawHtml = rawHtml.replace(/href="https:\/\/mynutrizen\.fr\/?"/g, `href="${pricingUrl}"`);

  // 3. Sanitize internal /blog/ links — redirect broken slugs to /blog
  rawHtml = rawHtml.replace(
    /href="(?:https:\/\/mynutrizen\.fr)?\/blog\/([^"]+)"/g,
    (_match: string, linkSlug: string) => {
      if (validSlugs.has(linkSlug)) {
        return `href="/blog/${linkSlug}"`;
      }
      return `href="/blog" title="Voir tous nos articles"`;
    }
  );

  // 4. Force external links to open in new tab
  rawHtml = rawHtml.replace(
    /<a\s+([^>]*?)href="(https?:\/\/(?!mynutrizen\.fr)[^"]+)"([^>]*?)>/g,
    (_match: string, before: string, url: string, after: string) => {
      if (before.includes('target=') || after.includes('target=')) return _match;
      return `<a ${before}href="${url}" target="_blank" rel="noopener noreferrer"${after}>`;
    }
  );

  const htmlContent =
    article.source === 'seo_factory' ? injectInternalLinks(rawHtml, relatedArticles) : rawHtml;

  // Check if FAQ is already well-rendered in HTML
  const htmlHasFaq =
    htmlContent.toLowerCase().includes('<details') || htmlContent.toLowerCase().includes('faq');
  const showExternalFaq = faqItems && faqItems.length > 0 && !htmlHasFaq;

  // ── SEO derived values (real data only) ───────────────────────────────────
  const metaTitle = outline?.meta_title || article.title;
  const metaDescription = outline?.meta_description || article.excerpt || '';
  const immediateAnswer =
    draftMeta?.quick_answer || outline?.quick_answer || outline?.excerpt || article.excerpt || '';
  const [contentBefore, contentAfter] = splitAtMiddleHeading(htmlContent);

  // FAQPage only when an FAQ is actually visible on the page
  const visibleFaq = showExternalFaq
    ? (faqItems ?? []).map((f) => ({ q: f.q, a: f.a }))
    : extractVisibleFaq(htmlContent);
  const faqJsonLd = buildFaqJsonLd(visibleFaq);

  const canonicalUrl = `https://mynutrizen.fr/blog/${article.slug}`;
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: h1 || article.title,
      description: metaDescription || undefined,
      image: heroImage
        ? heroImage.startsWith('http')
          ? heroImage
          : `https://mynutrizen.fr${heroImage}`
        : undefined,
      datePublished: article.published_at || undefined,
      dateModified: article.updated_at || article.published_at || undefined,
      author: { '@type': 'Organization', name: article.author || 'NutriZen', url: 'https://mynutrizen.fr' },
      publisher: {
        '@type': 'Organization',
        name: 'NutriZen',
        logo: { '@type': 'ImageObject', url: 'https://mynutrizen.fr/icons/icon-192.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      url: canonicalUrl,
      inLanguage: 'fr-FR',
    },
    buildBreadcrumbJsonLd('https://mynutrizen.fr', h1 || article.title, article.slug),
    ...(faqJsonLd ? [faqJsonLd] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {user ? <AppHeader /> : <Header onCtaClick={() => {}} />}

      <main className="flex-1 container py-16">
        <div className="max-w-3xl mx-auto">
          <Link to="/blog">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au blog
            </Button>
          </Link>

          {/* Article Header */}
          <header className="mb-8">
            <div className="flex gap-2 mb-4">
              {article.tags?.map((tag) => (
                <Badge key={tag} className="bg-secondary text-secondary-foreground">
                  {getCategoryLabel(tag)}
                </Badge>
              )) || (
                <Badge className="bg-secondary text-secondary-foreground">
                  {getCategoryLabel(article.cluster_context)}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{h1}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>📅 {formatDateFr(article.published_at)}</span>
              <span>⏱ {calculateReadTime(htmlContent)} min de lecture</span>
              <span>✍️ {article.author || 'NutriZen'}</span>
            </div>
          </header>

          {/* Hero Image */}
          {heroImage && (
            <figure className="mb-8 rounded-2xl overflow-hidden">
              <img
                src={heroImage}
                alt={heroAlt}
                width="1200"
                height="630"
                className="w-full h-64 md:h-96 object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={withImageFallback}
              />
            </figure>
          )}

          {/* Per-route SEO + BlogPosting / FAQPage / Breadcrumb JSON-LD */}
          <SeoHead
            title={metaTitle}
            description={metaDescription}
            canonicalPath={`/blog/${article.slug}`}
            ogType="article"
            ogImage={heroImage || undefined}
            jsonLd={jsonLd}
          />

          {/* Immediate answer (query answered before the long-form content) */}
          <ImmediateAnswer answer={immediateAnswer} />

          {/* Article Content */}
          <article
            className="article-content prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contentBefore) }}
          />

          {/* One contextual CTA inside long articles */}
          {contentAfter && <ContextualCta topic={h1 || article.title} />}

          {contentAfter && (
            <article
              className="article-content prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contentAfter) }}
            />
          )}


          {/* FAQ from draft_meta if not in HTML */}
          {showExternalFaq && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>
              <div className="space-y-3">
                {faqItems!.map((item, i) => (
                  <details key={i} className="border border-border rounded-lg overflow-hidden">
                    <summary className="p-4 cursor-pointer font-semibold bg-muted/50 flex justify-between items-center">
                      {item.q}
                      <span className="text-primary text-xl ml-2">+</span>
                    </summary>
                    <div className="p-4 text-muted-foreground leading-relaxed">{item.a}</div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Author bio block (E-E-A-T) */}
          <AuthorBio
            name={article.author || 'Équipe NutriZen'}
            title="Experts en nutrition & coachs santé NutriZen"
            avatarUrl="/icons/icon-192.png"
            linkedinUrl="https://www.linkedin.com/company/nutrizen"
          />

          {/* Horizontal scrollable related articles carousel */}
          {carouselArticles.length > 0 && (
            <section className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">À lire aussi</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => scrollBy(-1)}
                    disabled={!canScrollLeft}
                    className="p-2 rounded-full border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Défiler vers la gauche"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => scrollBy(1)}
                    disabled={!canScrollRight}
                    className="p-2 rounded-full border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Défiler vers la droite"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                ref={scrollRef}
                onScroll={updateScrollButtons}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {carouselArticles.map((ca) => {
                  const caImage = resolveArticleImage(ca);
                  const caTitle = ca.title || (ca.outline as any)?.title || ca.slug;
                  return (
                    <Link
                      key={ca.id}
                      to={`/blog/${ca.slug}`}
                      className="flex-shrink-0 w-64 snap-start"
                    >
                      <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all h-full border border-border">
                        <div className="h-36 overflow-hidden bg-muted">
                          {caImage ? (
                            <img
                              src={caImage}
                              alt={caTitle}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={withImageFallback}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">
                              🥗
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          {ca.cluster_context && (
                            <span className="inline-block text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1">
                              {getCategoryLabel(ca.cluster_context)}
                            </span>
                          )}
                          <h3 className="font-semibold text-sm line-clamp-2">{caTitle}</h3>
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {formatDateFr(ca.published_at)}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Share Buttons */}
          <div className="mt-10 flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">Partager cet article</p>
            <SocialShareButtons url={`https://mynutrizen.fr/blog/${article.slug}`} text={h1} />
          </div>

          {/* CTA Block */}
          <div className="mt-12 p-6 bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl">
            <h3 className="text-xl font-bold mb-2">Envie d'essayer NutriZen ?</h3>
            <p className="text-muted-foreground mb-4">
              Laisse-nous générer tes menus et ta liste de courses automatiquement.
            </p>
            <Link to="/pricing">
              <Button>Voir les formules</Button>
            </Link>
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section className="mt-12 pt-8 border-t-2 border-border">
              <h2 className="text-xl font-bold mb-2">Articles qui pourraient vous intéresser</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Continuez à explorer nos conseils nutrition
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedArticles.map((ra) => {
                  const raImage = resolveArticleImage(ra);
                  const raTitle = ra.title || (ra.outline as any)?.title || ra.slug;
                  const raExcerpt =
                    ra.excerpt ||
                    (ra.outline as any)?.excerpt ||
                    (ra.outline as any)?.meta_description;
                  return (
                    <Link key={ra.id} to={`/blog/${ra.slug}`}>
                      <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all h-full border border-border">
                        <div className="h-40 overflow-hidden bg-muted">
                          {raImage ? (
                            <img
                              src={raImage}
                              alt={raTitle}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              loading="lazy"
                              onError={withImageFallback}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                              🥗
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          {ra.cluster_context && (
                            <span className="inline-block text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">
                              {getCategoryLabel(ra.cluster_context)}
                            </span>
                          )}
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2">{raTitle}</h3>
                          {raExcerpt && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {raExcerpt}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                            <span>{formatDateFr(ra.published_at)}</span>
                            <span className="text-primary font-semibold">Lire →</span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      {user ? <AppFooter /> : <Footer />}
    </div>
  );
}

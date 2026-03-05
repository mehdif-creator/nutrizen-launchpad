import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { useBlogArticleBySlug } from '@/hooks/useBlogArticles';
import { useEffect } from 'react';

function formatDateFr(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function useArticleSeoHead(article: ReturnType<typeof useBlogArticleBySlug>['article']) {
  useEffect(() => {
    if (!article) return;

    const outline = article.outline as any;
    const metaTitle = outline?.meta_title || article.title;
    const metaDesc = outline?.meta_description || article.excerpt || '';
    const ogImage = article.cover_url || '';
    const canonical = `https://mynutrizen.fr/blog/${article.slug}`;

    document.title = metaTitle;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', metaDesc);
    setMeta('og:title', metaTitle, true);
    setMeta('og:description', metaDesc, true);
    setMeta('og:image', ogImage, true);
    setMeta('og:type', 'article', true);
    setMeta('og:locale', 'fr_FR', true);
    setMeta('og:site_name', 'NutriZen', true);
    setMeta('og:url', canonical, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', metaTitle);
    setMeta('twitter:description', metaDesc);
    setMeta('twitter:image', ogImage);
    setMeta('robots', 'index, follow');

    // Canonical
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonical;

    // JSON-LD
    let ldEl = document.getElementById('article-jsonld');
    if (!ldEl) {
      ldEl = document.createElement('script');
      ldEl.id = 'article-jsonld';
      ldEl.setAttribute('type', 'application/ld+json');
      document.head.appendChild(ldEl);
    }
    if (article.schema_json) {
      ldEl.textContent = JSON.stringify(article.schema_json);
    }

    return () => {
      document.title = 'NutriZen — Menus personnalisés';
      ldEl?.remove();
    };
  }, [article]);
}

/** Inject "Pour aller plus loin" links before FAQ section in HTML */
function injectInternalLinks(html: string, related: ReturnType<typeof useBlogArticleBySlug>['relatedArticles']): string {
  if (!html || related.length === 0) return html;
  const linksHtml = `
<div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 32px 0;">
  <p style="font-weight: 600; margin: 0 0 12px 0; color: #374151;">📚 Pour aller plus loin :</p>
  <ul style="margin: 0; padding-left: 20px;">
    ${related.map(a => `<li style="margin-bottom: 8px;"><a href="/blog/${a.slug}" style="color: #16a34a; text-decoration: none; font-weight: 500;">${a.title}</a></li>`).join('')}
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
  const { article, relatedArticles, loading } = useBlogArticleBySlug(slug);

  useArticleSeoHead(article);

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
          <Link to="/blog"><Button variant="outline">Retour au blog</Button></Link>
        </main>
        {user ? <AppFooter /> : <Footer />}
      </div>
    );
  }

  const outline = article.outline as any;
  const readingTime = outline?.reading_time_minutes;
  const h1 = outline?.h1 || article.title;
  const images = article.image_urls as any[];
  const heroImage = images?.[0]?.url || images?.[0] || article.cover_url;
  const heroAlt = images?.[0]?.alt || article.title;
  const draftMeta = article.draft_meta as any;
  const faqItems = draftMeta?.faq as { q: string; a: string }[] | undefined;

  // Build the article HTML with internal links injected
  const htmlContent = article.source === 'seo_factory'
    ? injectInternalLinks(article.draft_html || article.content || '', relatedArticles)
    : article.content || '';

  // Check if FAQ is already well-rendered in HTML
  const htmlHasFaq = htmlContent.toLowerCase().includes('<details') || htmlContent.toLowerCase().includes('faq');
  const showExternalFaq = faqItems && faqItems.length > 0 && !htmlHasFaq;

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
                <Badge key={tag} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {tag}
                </Badge>
              )) || (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {article.cluster_context || 'Nutrition'}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              {h1}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>📅 {formatDateFr(article.published_at)}</span>
              {readingTime && <span>⏱ {readingTime} min de lecture</span>}
              <span>✍️ {article.author || 'NutriZen'}</span>
            </div>
          </header>

          {/* Hero Image */}
          {heroImage && (
            <figure className="mb-8 rounded-2xl overflow-hidden">
              <img
                src={heroImage}
                alt={heroAlt}
                className="w-full h-64 md:h-96 object-cover"
                loading="eager"
              />
            </figure>
          )}

          {/* Article Content */}
          <article
            className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

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
                    <div className="p-4 text-muted-foreground leading-relaxed">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* CTA Block */}
          <div className="mt-12 p-6 bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl">
            <h3 className="text-xl font-bold mb-2">
              Envie d'essayer NutriZen ?
            </h3>
            <p className="text-muted-foreground mb-4">
              Laisse-nous générer tes menus et ta liste de courses automatiquement.
            </p>
            <Link to="/signup">
              <Button>Commencer gratuitement</Button>
            </Link>
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section className="mt-12 pt-8 border-t-2 border-border">
              <h2 className="text-xl font-bold mb-6">Articles qui pourraient vous intéresser</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedArticles.map((ra) => (
                  <Link key={ra.id} to={`/blog/${ra.slug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-all h-full">
                      {ra.cover_url && (
                        <img
                          src={ra.cover_url}
                          alt={ra.title}
                          className="w-full h-36 object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{ra.title}</h3>
                        {ra.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{ra.excerpt}</p>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {user ? <AppFooter /> : <Footer />}
    </div>
  );
}

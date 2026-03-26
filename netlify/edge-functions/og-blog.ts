/**
 * Netlify Edge Function: Server-side enrichment for /blog/:slug
 *
 * Serves ALL visitors (browsers, social bots, search engines) with the same
 * enriched HTML: the SPA shell + article-specific meta tags + article content.
 *
 * This is NOT cloaking — every visitor gets identical HTML.
 * No bot-specific code paths. No X-Robots-Tag. No noindex.
 *
 * The injected article content is visible on first paint and removed once
 * React hydrates, so there is no visual duplication.
 */

import type { Context } from 'https://edge.netlify.com';

const SUPABASE_URL = 'https://pghdaozgxkbtsxwydemd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU';
const SITE_URL = 'https://mynutrizen.fr';
const FALLBACK_IMAGE = `${SITE_URL}/img/og-default.png`;
const SITE_NAME = 'NutriZen';
const FALLBACK_DESC =
  'Menus nutritionnels personnalisés adaptés à tes objectifs. Plan alimentaire sur-mesure, liste de courses automatique, recettes rapides.';

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirstParagraph(html: string): string | null {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!match) return null;
  const text = stripHtml(match[1]);
  return text.length > 30 ? text : null;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncateDesc(text: string, max = 160): string {
  if (text.length <= max) return text;
  const truncated = text.slice(0, max);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + '…';
}

function resolveDescription(
  seoDesc?: string | null,
  excerpt?: string | null,
  htmlContent?: string | null,
): string {
  if (seoDesc && seoDesc.trim().length > 20) return truncateDesc(stripHtml(seoDesc));
  if (excerpt && excerpt.trim().length > 20) return truncateDesc(stripHtml(excerpt));
  if (htmlContent) {
    const para = extractFirstParagraph(htmlContent);
    if (para && para.length > 20) return truncateDesc(para);
  }
  return FALLBACK_DESC;
}

function toAbsoluteUrl(url: string): string {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

function computeReadTime(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter((w) => w.length > 0).length;
  return Math.max(1, Math.round(words / 200));
}

function cleanArticleHtml(html: string): string {
  let c = html;
  c = c.replace(/\{\{IMAGE_\d+_URL\}\}/g, '');
  c = c.replace(/\{\{IMAGE_\d+_ALT\}\}/g, '');
  c = c.replace(/\{\{NUTRIZEN_CTA_URL\}\}/g, `${SITE_URL}/`);
  c = c.replace(/<figure[^>]*>\s*<img[^>]*src=""[^>]*\/?>\s*(?:<figcaption[^>]*>.*?<\/figcaption>\s*)?<\/figure>/gi, '');
  c = c.replace(/<img[^>]*src=""[^>]*\/?>/gi, '');
  return c;
}

function resolveImagePlaceholders(html: string, images: any[]): string {
  let result = html;
  if (!images || images.length === 0) return result;
  images.forEach((img: any, index: number) => {
    const n = index + 1;
    const url = typeof img === 'string' ? img : img?.url;
    const alt = typeof img === 'string' ? '' : img?.alt || '';
    if (url && url.trim()) {
      result = result.split(`{{IMAGE_${n}_URL}}`).join(url.trim());
      result = result.split(`src="{{IMAGE_${n}_URL}}"`).join(`src="${url.trim()}"`);
    }
    if (alt) {
      result = result.split(`{{IMAGE_${n}_ALT}}`).join(alt);
    }
  });
  return result;
}

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// ── Article data types & fetching ────────────────────────────────────────────

interface ArticleData {
  title: string;
  h1: string;
  description: string;
  image: string;
  canonical: string;
  publishedTime: string | null;
  author: string;
  htmlContent: string;
  tags: string[];
  schemaJson: any | null;
  readTimeMinutes: number;
}

async function fetchArticleBySlug(slug: string): Promise<ArticleData | null> {
  // 1. Try blog_posts by slug (direct indexed lookup)
  const manualRes = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );

  if (manualRes.ok) {
    const rows = await manualRes.json();
    if (rows.length > 0) {
      const p = rows[0];
      if (!p.published_at) return null;
      const content = p.content || '';
      return {
        title: p.title,
        h1: p.title,
        description: resolveDescription(p.excerpt, null, content),
        image: toAbsoluteUrl(p.cover_url || ''),
        canonical: `${SITE_URL}/blog/${slug}`,
        publishedTime: p.published_at,
        author: p.author || SITE_NAME,
        htmlContent: cleanArticleHtml(content),
        tags: p.tags || [],
        schemaJson: null,
        readTimeMinutes: computeReadTime(content),
      };
    }
  }

  // 2. Try seo_articles (need to match slug from outline or keyword)
  const seoRes = await fetch(
    `${SUPABASE_URL}/rest/v1/seo_articles?status=eq.published&select=id,keyword,outline,image_urls,draft_html,draft_meta,schema_json,cluster_context,updated_at,created_at`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );
  if (!seoRes.ok) return null;

  const seoRows = await seoRes.json();
  const match = seoRows.find((a: any) => {
    const o = a.outline as any;
    const derivedSlug =
      o?.slug || a.keyword?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return derivedSlug === slug;
  });
  if (!match) return null;

  const outline = match.outline as any;
  const images = match.image_urls as any[];

  const title = outline?.meta_title || outline?.title || outline?.h1 || match.keyword || slug;
  const h1 = outline?.h1 || outline?.title || match.keyword || slug;
  const description = resolveDescription(outline?.meta_description, outline?.excerpt, match.draft_html);

  let image = '';
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    const url = typeof first === 'string' ? first : first?.url;
    if (url && url.trim()) image = url.trim();
  }

  let htmlContent = match.draft_html || '';
  if (Array.isArray(images)) htmlContent = resolveImagePlaceholders(htmlContent, images);
  htmlContent = cleanArticleHtml(htmlContent);

  return {
    title,
    h1,
    description,
    image: toAbsoluteUrl(image),
    canonical: `${SITE_URL}/blog/${slug}`,
    publishedTime: match.updated_at || match.created_at || null,
    author: SITE_NAME,
    htmlContent,
    tags: match.cluster_context ? [match.cluster_context] : [],
    schemaJson: match.schema_json || null,
    readTimeMinutes: computeReadTime(htmlContent),
  };
}

// ── HTML injection into SPA shell ────────────────────────────────────────────

function buildHeadInjection(a: ArticleData): string {
  const t = escapeAttr(a.title);
  const d = escapeAttr(a.description);
  const img = escapeAttr(a.image);
  const url = escapeAttr(a.canonical);
  const author = escapeAttr(a.author);

  const jsonLd = a.schemaJson || {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.h1,
    description: a.description,
    image: a.image,
    url: a.canonical,
    datePublished: a.publishedTime,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': a.canonical },
    inLanguage: 'fr',
  };

  return `
  <!-- SSR article meta -->
  <meta name="description" content="${d}" />
  <meta name="author" content="${author}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="fr_FR" />
  ${a.publishedTime ? `<meta property="article:published_time" content="${escapeAttr(a.publishedTime)}" />` : ''}
  <meta property="article:author" content="${author}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@nutrizen_fr" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <!-- /SSR article meta -->`;
}

function buildBodyInjection(a: ArticleData): string {
  const h1 = escapeAttr(a.h1);
  const author = escapeAttr(a.author);
  const dateFr = formatDateFr(a.publishedTime);
  const img = escapeAttr(a.image);

  return `
  <div id="ssr-article" style="max-width:768px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;line-height:1.7">
    <nav style="font-size:0.875rem;color:#6b7280;margin-bottom:24px" aria-label="Fil d'Ariane">
      <a href="/" style="color:#0D7377;text-decoration:none">Accueil</a> ›
      <a href="/blog" style="color:#0D7377;text-decoration:none">Blog</a> ›
      <span>${h1}</span>
    </nav>
    ${a.tags.length > 0 ? a.tags.map((tag) => `<span style="display:inline-block;background:#e5f7f7;color:#0D7377;padding:4px 12px;border-radius:999px;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">${escapeAttr(tag)}</span>`).join(' ') : ''}
    <h1 style="font-size:2rem;font-weight:800;line-height:1.2;margin-bottom:16px;color:#111">${h1}</h1>
    <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:0.875rem;color:#6b7280;margin-bottom:24px">
      ${dateFr ? `<span>📅 ${dateFr}</span>` : ''}
      <span>⏱ ${a.readTimeMinutes} min de lecture</span>
      <span>✍️ ${author}</span>
    </div>
    ${a.image !== FALLBACK_IMAGE ? `<img src="${img}" alt="${h1}" style="width:100%;height:auto;border-radius:12px;margin-bottom:32px;max-height:400px;object-fit:cover" />` : ''}
    <article style="font-size:1.05rem">${a.htmlContent}</article>
  </div>
  <script>
    // Remove SSR content once React hydrates to avoid duplication
    (function(){
      var el = document.getElementById('ssr-article');
      if (el) {
        var observer = new MutationObserver(function() {
          var root = document.getElementById('root');
          if (root && root.children.length > 0) {
            el.remove();
            observer.disconnect();
          }
        });
        observer.observe(document.getElementById('root'), { childList: true });
        // Fallback: remove after 5s regardless
        setTimeout(function() { if (el.parentNode) el.remove(); observer.disconnect(); }, 5000);
      }
    })();
  </script>`;
}

function injectIntoHtml(originalHtml: string, article: ArticleData): string {
  let html = originalHtml;

  // 1. Replace <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeAttr(article.title)} — ${SITE_NAME}</title>`,
  );

  // 2. Remove existing generic meta tags that we'll replace
  // Remove existing description
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/g, '');
  // Remove existing canonical
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/g, '');
  // Remove existing OG tags
  html = html.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>/g, '');
  // Remove existing twitter tags
  html = html.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>/g, '');

  // 3. Inject article-specific head tags before </head>
  const headInjection = buildHeadInjection(article);
  html = html.replace('</head>', `${headInjection}\n</head>`);

  // 4. Inject article content before <div id="root">
  const bodyInjection = buildBodyInjection(article);
  html = html.replace('<div id="root"></div>', `${bodyInjection}\n    <div id="root"></div>`);

  return html;
}

// ── 404 page ─────────────────────────────────────────────────────────────────

function build404Html(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Article introuvable — ${SITE_NAME}</title>
  <meta name="robots" content="noindex" />
  <meta name="description" content="Cet article n'existe pas ou a été supprimé." />
  <link rel="icon" href="${SITE_URL}/favicon.png" type="image/png" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #1a1a1a; }
    .box { text-align: center; max-width: 480px; padding: 48px 24px; }
    h1 { font-size: 3rem; font-weight: 800; color: #0D7377; margin-bottom: 16px; }
    p { font-size: 1.125rem; color: #6b7280; margin-bottom: 24px; }
    a { display: inline-block; background: #0D7377; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    a:hover { background: #0a5c5f; }
  </style>
</head>
<body>
  <div class="box">
    <h1>404</h1>
    <p>Cet article n'existe pas ou a été supprimé.</p>
    <a href="${SITE_URL}/blog">Voir tous les articles</a>
  </div>
</body>
</html>`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // Only handle /blog/:slug — let /blog pass through to SPA
  if (pathParts.length < 2 || pathParts[0] !== 'blog') {
    return context.next();
  }

  const slug = decodeURIComponent(pathParts[1]);

  // Skip asset requests
  if (slug.includes('.') && !slug.endsWith('.html')) {
    return context.next();
  }

  try {
    const article = await fetchArticleBySlug(slug);

    if (!article) {
      // Real 404 for unknown slugs
      return new Response(build404Html(), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Get the original SPA HTML from Netlify
    const originalResponse = await context.next();
    const originalHtml = await originalResponse.text();

    // Inject article-specific meta + content into the SPA shell
    const enrichedHtml = injectIntoHtml(originalHtml, article);

    return new Response(enrichedHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
      },
    });
  } catch (err) {
    console.error('[og-blog] Error enriching article:', err);
    // Fail open: serve the normal SPA
    return context.next();
  }
}

export const config = {
  path: '/blog/*',
};

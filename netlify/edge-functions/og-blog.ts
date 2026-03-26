/**
 * Netlify Edge Function: server-side rendered blog articles for crawlers.
 *
 * For search engine crawlers (Googlebot, Bingbot, etc.) AND social media bots,
 * this function fetches the article from Supabase and returns a full HTML page
 * with real article content, structured data, and proper OG/Twitter meta tags.
 *
 * Regular browser visitors pass through to the SPA unchanged.
 */

const SUPABASE_URL = 'https://pghdaozgxkbtsxwydemd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU';
const SITE_URL = 'https://mynutrizen.fr';
const FALLBACK_IMAGE = `${SITE_URL}/img/og-default.png`;
const SITE_NAME = 'NutriZen';
const FALLBACK_DESC =
  'Menus nutritionnels personnalisés adaptés à tes objectifs. Plan alimentaire sur-mesure, liste de courses automatique, recettes rapides.';

const CRAWLER_UA_PATTERNS = [
  'facebookexternalhit', 'Facebot', 'LinkedInBot', 'Twitterbot',
  'Slackbot', 'WhatsApp', 'TelegramBot', 'Discordbot', 'Pinterestbot',
  'Googlebot', 'bingbot', 'Applebot', 'Embedly', 'Iframely',
  'vkShare', 'W3C_Validator', 'redditbot', 'Rogerbot',
  'SemrushBot', 'AhrefsBot', 'YandexBot', 'DuckDuckBot',
  'Baiduspider', 'Sogou', 'ia_archiver', 'archive.org_bot',
];

function isCrawler(ua: string): boolean {
  const lower = ua.toLowerCase();
  return CRAWLER_UA_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

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

function escapeHtml(str: string): string {
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
  seoDesc: string | null | undefined,
  excerpt: string | null | undefined,
  htmlContent: string | null | undefined
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

function computeReadTime(html: string): number {
  const text = stripHtml(html);
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.round(words / 200));
}

/** Clean article HTML: strip image placeholders, fix CTA links */
function cleanArticleHtml(html: string): string {
  let cleaned = html;
  cleaned = cleaned.replace(/\{\{IMAGE_\d+_URL\}\}/g, '');
  cleaned = cleaned.replace(/\{\{IMAGE_\d+_ALT\}\}/g, '');
  cleaned = cleaned.replace(/\{\{NUTRIZEN_CTA_URL\}\}/g, `${SITE_URL}/`);
  // Remove empty figure/img tags from placeholder cleanup
  cleaned = cleaned.replace(/<figure[^>]*>\s*<img[^>]*src=""[^>]*\/?>\s*(?:<figcaption[^>]*>.*?<\/figcaption>\s*)?<\/figure>/gi, '');
  cleaned = cleaned.replace(/<img[^>]*src=""[^>]*\/?>/gi, '');
  return cleaned;
}

/** Replace image placeholders with real URLs */
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

async function fetchArticleBySlug(slug: string): Promise<ArticleData | null> {
  // 1. Try blog_posts table
  const manualRes = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );

  if (manualRes.ok) {
    const rows = await manualRes.json();
    if (rows.length > 0) {
      const p = rows[0];
      if (!p.published_at) return null;

      const description = resolveDescription(p.excerpt, null, p.content);
      const image = p.cover_url || FALLBACK_IMAGE;
      const content = p.content || '';

      return {
        title: p.title,
        h1: p.title,
        description,
        image: toAbsoluteUrl(image),
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

  // 2. Try seo_articles table
  const seoRes = await fetch(
    `${SUPABASE_URL}/rest/v1/seo_articles?status=eq.published&select=*`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
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

  let image = FALLBACK_IMAGE;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    const url = typeof first === 'string' ? first : first?.url;
    if (url && url.trim()) image = url.trim();
  }

  let htmlContent = match.draft_html || '';
  if (Array.isArray(images)) {
    htmlContent = resolveImagePlaceholders(htmlContent, images);
  }
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

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return ''; }
}

function buildFullHtml(article: ArticleData): string {
  const t = escapeHtml(article.title);
  const h1 = escapeHtml(article.h1);
  const d = escapeHtml(article.description);
  const img = escapeHtml(article.image);
  const url = escapeHtml(article.canonical);
  const author = escapeHtml(article.author);
  const dateFr = formatDateFr(article.publishedTime);
  const pub = article.publishedTime
    ? `<meta property="article:published_time" content="${escapeHtml(article.publishedTime)}" />`
    : '';

  // Build JSON-LD structured data
  const jsonLd = article.schemaJson || {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.h1,
    description: article.description,
    image: article.image,
    url: article.canonical,
    datePublished: article.publishedTime,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': article.canonical },
    inLanguage: 'fr',
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <meta name="author" content="${author}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" href="${SITE_URL}/favicon.png" type="image/png" />
  <link rel="sitemap" type="application/xml" href="${SITE_URL}/sitemap.xml" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="fr_FR" />
  ${pub}
  <meta property="article:author" content="${author}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@nutrizen_fr" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; background: #fff; line-height: 1.7; }
    .site-header { background: #0D7377; color: #fff; padding: 16px 24px; }
    .site-header a { color: #fff; text-decoration: none; font-weight: 700; font-size: 1.25rem; }
    .container { max-width: 768px; margin: 0 auto; padding: 32px 20px; }
    .breadcrumb { font-size: 0.875rem; color: #6b7280; margin-bottom: 24px; }
    .breadcrumb a { color: #0D7377; text-decoration: none; }
    .article-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.875rem; color: #6b7280; margin-bottom: 24px; }
    .tag { display: inline-block; background: #e5f7f7; color: #0D7377; padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    h1 { font-size: 2rem; font-weight: 800; line-height: 1.2; margin-bottom: 16px; color: #111; }
    .hero-img { width: 100%; height: auto; border-radius: 12px; margin-bottom: 32px; max-height: 400px; object-fit: cover; }
    .article-body { font-size: 1.05rem; }
    .article-body h2 { font-size: 1.5rem; font-weight: 700; margin: 32px 0 16px; color: #111; }
    .article-body h3 { font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px; color: #222; }
    .article-body p { margin-bottom: 16px; }
    .article-body ul, .article-body ol { margin-bottom: 16px; padding-left: 24px; }
    .article-body li { margin-bottom: 8px; }
    .article-body a { color: #0D7377; }
    .article-body img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
    .article-body blockquote { border-left: 4px solid #0D7377; padding: 12px 20px; margin: 16px 0; background: #f9fafb; font-style: italic; }
    .article-body table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .article-body th, .article-body td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    .article-body th { background: #f3f4f6; font-weight: 600; }
    .article-body details { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; }
    .article-body summary { cursor: pointer; font-weight: 600; }
    .site-footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px; text-align: center; font-size: 0.875rem; color: #6b7280; margin-top: 48px; }
    .site-footer a { color: #0D7377; text-decoration: none; }
    @media (max-width: 640px) { h1 { font-size: 1.5rem; } .container { padding: 20px 16px; } }
  </style>
</head>
<body>
  <header class="site-header">
    <a href="${SITE_URL}/">${SITE_NAME}</a>
  </header>

  <main class="container">
    <nav class="breadcrumb" aria-label="Fil d'Ariane">
      <a href="${SITE_URL}/">Accueil</a> &rsaquo;
      <a href="${SITE_URL}/blog">Blog</a> &rsaquo;
      <span>${h1}</span>
    </nav>

    ${article.tags.length > 0 ? article.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join(' ') : ''}

    <h1>${h1}</h1>

    <div class="article-meta">
      ${dateFr ? `<span>📅 ${dateFr}</span>` : ''}
      <span>⏱ ${article.readTimeMinutes} min de lecture</span>
      <span>✍️ ${author}</span>
    </div>

    ${article.image !== FALLBACK_IMAGE ? `<img class="hero-img" src="${img}" alt="${h1}" />` : ''}

    <article class="article-body">
      ${article.htmlContent}
    </article>
  </main>

  <footer class="site-footer">
    <p>&copy; ${new Date().getFullYear()} <a href="${SITE_URL}/">${SITE_NAME}</a> — Menus nutritionnels personnalisés</p>
    <p><a href="${SITE_URL}/blog">Tous les articles</a></p>
  </footer>
</body>
</html>`;
}

export default async function handler(request: Request) {
  const ua = request.headers.get('user-agent') || '';

  if (!isCrawler(ua)) {
    return; // pass through to SPA
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (pathParts.length < 2 || pathParts[0] !== 'blog') {
    return;
  }

  const slug = pathParts[1];

  try {
    const article = await fetchArticleBySlug(slug);

    if (!article) {
      return; // pass through to SPA 404
    }

    const html = buildFullHtml(article);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (err) {
    console.error('[og-blog] Error:', err);
    return; // fail open
  }
}

export const config = {
  path: '/blog/*',
};

/**
 * Netlify Edge Function: social-crawler OG meta injection for /blog/:slug
 *
 * When a social-media crawler (Facebook, LinkedIn, X, Telegram, WhatsApp, etc.)
 * requests a blog article URL, this function fetches the article data from
 * Supabase and returns a minimal HTML page with the correct Open Graph and
 * Twitter Card meta tags.
 *
 * Regular browser visitors are passed through to the SPA unchanged.
 */

const SUPABASE_URL = 'https://pghdaozgxkbtsxwydemd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU';
const SITE_URL = 'https://mynutrizen.fr';
const FALLBACK_IMAGE = `${SITE_URL}/img/og-default.png`;
const SITE_NAME = 'NutriZen';
const FALLBACK_DESC =
  'Menus nutritionnels personnalisés adaptés à tes objectifs. Plan alimentaire sur-mesure, liste de courses automatique, recettes rapides.';

// User-agent substrings used by social media crawlers
const CRAWLER_UA_PATTERNS = [
  'facebookexternalhit',
  'Facebot',
  'LinkedInBot',
  'Twitterbot',
  'Slackbot',
  'WhatsApp',
  'TelegramBot',
  'Discordbot',
  'Pinterestbot',
  'Googlebot',        // also helps with SEO
  'bingbot',
  'Applebot',
  'Embedly',
  'Iframely',
  'vkShare',
  'W3C_Validator',
  'redditbot',
  'Rogerbot',
  'SemrushBot',
  'AhrefsBot',
];

function isCrawler(ua: string): boolean {
  const lower = ua.toLowerCase();
  return CRAWLER_UA_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

/** Strip HTML tags and normalize whitespace */
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

/** Extract first meaningful paragraph from HTML content */
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

/** Truncate description to ~160 chars at word boundary */
function truncateDesc(text: string, max = 160): string {
  if (text.length <= max) return text;
  const truncated = text.slice(0, max);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + '…';
}

interface ArticleData {
  title: string;
  description: string;
  image: string;
  canonical: string;
  publishedTime: string | null;
  author: string;
}

async function fetchArticleBySlug(slug: string): Promise<ArticleData | null> {
  // 1. Try blog_posts table
  const manualRes = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (manualRes.ok) {
    const rows = await manualRes.json();
    if (rows.length > 0) {
      const p = rows[0];
      if (!p.published_at) return null; // not published

      const description = resolveDescription(p.excerpt, null, p.content);
      const image = p.cover_url || FALLBACK_IMAGE;

      return {
        title: p.title,
        description,
        image: toAbsoluteUrl(image),
        canonical: `${SITE_URL}/blog/${slug}`,
        publishedTime: p.published_at,
        author: p.author || SITE_NAME,
      };
    }
  }

  // 2. Try seo_articles table
  const seoRes = await fetch(
    `${SUPABASE_URL}/rest/v1/seo_articles?status=eq.published&select=*`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!seoRes.ok) return null;

  const seoRows = await seoRes.json();
  const match = seoRows.find((a: any) => {
    const o = a.outline as any;
    const derivedSlug =
      o?.slug ||
      a.keyword
        ?.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    return derivedSlug === slug;
  });

  if (!match) return null;

  const outline = match.outline as any;
  const images = match.image_urls as any[];
  const draftMeta = match.draft_meta as any;

  const title = outline?.meta_title || outline?.title || outline?.h1 || match.keyword || slug;

  const description = resolveDescription(
    outline?.meta_description,
    outline?.excerpt,
    match.draft_html
  );

  // Image priority: first image_urls entry > cover from outline > fallback
  let image = FALLBACK_IMAGE;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    const url = typeof first === 'string' ? first : first?.url;
    if (url && url.trim()) image = url.trim();
  }

  return {
    title,
    description,
    image: toAbsoluteUrl(image),
    canonical: `${SITE_URL}/blog/${slug}`,
    publishedTime: match.updated_at || match.created_at || null,
    author: SITE_NAME,
  };
}

function resolveDescription(
  seoDesc: string | null | undefined,
  excerpt: string | null | undefined,
  htmlContent: string | null | undefined
): string {
  // Priority: seoDescription > excerpt > first paragraph > fallback
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

function buildMetaHtml(article: ArticleData): string {
  const t = escapeHtml(article.title);
  const d = escapeHtml(article.description);
  const img = escapeHtml(article.image);
  const url = escapeHtml(article.canonical);
  const pub = article.publishedTime ? `<meta property="article:published_time" content="${escapeHtml(article.publishedTime)}" />` : '';
  const author = escapeHtml(article.author);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <link rel="canonical" href="${url}" />

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

  <!-- Redirect human visitors who somehow see this page -->
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p>Redirection vers <a href="${url}">${t}</a>…</p>
</body>
</html>`;
}

export default async function handler(request: Request) {
  const ua = request.headers.get('user-agent') || '';

  // Only intercept for social crawlers
  if (!isCrawler(ua)) {
    return; // pass through to SPA (returns undefined = Netlify serves origin)
  }

  // Extract slug from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // Expect /blog/:slug
  if (pathParts.length < 2 || pathParts[0] !== 'blog') {
    return; // pass through
  }

  const slug = pathParts[1];

  try {
    const article = await fetchArticleBySlug(slug);

    if (!article) {
      return; // article not found, pass through to SPA 404
    }

    const html = buildMetaHtml(article);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Robots-Tag': 'noindex', // crawler page itself shouldn't be indexed
      },
    });
  } catch (err) {
    console.error('[og-blog] Error fetching article:', err);
    return; // fail open: pass through to SPA
  }
}

export const config = {
  path: '/blog/*',
};

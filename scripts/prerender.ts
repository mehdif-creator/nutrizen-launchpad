/**
 * Build-time prerender (postbuild).
 *
 * Lovable hosting serves static files from dist/ and falls back to index.html
 * for unknown paths. Because index.html carries a single set of meta tags,
 * every route used to declare the homepage as its canonical URL — which stops
 * Google from indexing blog articles and landing pages.
 *
 * This script writes one real HTML file per public route with:
 *  - correct <title>, description, canonical, OG/Twitter tags
 *  - crawlable article content + internal links for /blog and /blog/:slug
 *  - JSON-LD (Article + BreadcrumbList)
 *
 * The React SPA still boots normally and removes the static block once mounted.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '..', 'dist');

const SITE_URL = 'https://mynutrizen.fr';
const SITE_NAME = 'NutriZen';
const FALLBACK_IMAGE = `${SITE_URL}/img/og-default.png`;
const FALLBACK_DESC =
  'Menus nutritionnels personnalisés adaptés à vos objectifs. Plan alimentaire sur-mesure, liste de courses automatique, recettes rapides.';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pghdaozgxkbtsxwydemd.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU';

/** Safety cap — publishing rejects builds with huge file counts. */
const MAX_PRERENDERED_ARTICLES = Number(process.env.MAX_PRERENDER_PAGES || 2000);

// ── helpers ──────────────────────────────────────────────────────────────────

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const escapeAttr = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  const t = text.slice(0, max);
  const ls = t.lastIndexOf(' ');
  return (ls > 80 ? t.slice(0, ls) : t) + '…';
}

function resolveDescription(...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) {
    if (c && stripHtml(c).length > 20) return truncate(stripHtml(c));
  }
  return FALLBACK_DESC;
}

function firstParagraph(html: string): string | null {
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return null;
  const text = stripHtml(m[1]);
  return text.length > 30 ? text : null;
}

const toAbsolute = (url: string): string => {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http')) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

function cleanArticleHtml(html: string): string {
  return html
    .replace(/\{\{IMAGE_\d+_URL\}\}/g, '')
    .replace(/\{\{IMAGE_\d+_ALT\}\}/g, '')
    .replace(/\{\{NUTRIZEN_CTA_URL\}\}/g, `${SITE_URL}/`)
    .replace(
      /<figure[^>]*>\s*<img[^>]*src=""[^>]*\/?>\s*(?:<figcaption[^>]*>.*?<\/figcaption>\s*)?<\/figure>/gi,
      '',
    )
    .replace(/<img[^>]*src=""[^>]*\/?>/gi, '');
}

function resolveImagePlaceholders(html: string, images: unknown[]): string {
  let out = html;
  images.forEach((img, i) => {
    const n = i + 1;
    const url = typeof img === 'string' ? img : ((img as { url?: string })?.url ?? '');
    const alt = typeof img === 'string' ? '' : ((img as { alt?: string })?.alt ?? '');
    if (url?.trim()) out = out.split(`{{IMAGE_${n}_URL}}`).join(url.trim());
    if (alt) out = out.split(`{{IMAGE_${n}_ALT}}`).join(alt);
  });
  return out;
}

const readTime = (html: string): number =>
  Math.max(1, Math.round(stripHtml(html).split(/\s+/).filter(Boolean).length / 200));

const formatDateFr = (d: string | null): string => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

async function sb<T = Record<string, unknown>>(path: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) {
    console.warn(`[prerender] Supabase ${path} → ${res.status}`);
    return [];
  }
  return (await res.json()) as T[];
}

// ── data ─────────────────────────────────────────────────────────────────────

interface Article {
  slug: string;
  title: string;
  h1: string;
  description: string;
  image: string;
  html: string;
  publishedTime: string | null;
  category: string;
  schemaJson: Record<string, unknown> | null;
}

async function fetchArticles(): Promise<Article[]> {
  const out: Article[] = [];
  const seen = new Set<string>();

  const seoRows = await sb<Record<string, any>>(
    'seo_articles?status=eq.published&slug=not.is.null&select=slug,keyword,outline,image_urls,draft_html,schema_json,cluster_context,updated_at,created_at&order=updated_at.desc',
  );
  for (const a of seoRows) {
    const slug = String(a.slug || '');
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const o = a.outline || {};
    const images: unknown[] = Array.isArray(a.image_urls) ? a.image_urls : [];
    let html = String(a.draft_html || '');
    html = cleanArticleHtml(resolveImagePlaceholders(html, images));
    const first = images[0];
    const image = (typeof first === 'string' ? first : (first as { url?: string })?.url) || '';
    out.push({
      slug,
      title: o.meta_title || o.title || o.h1 || a.keyword || slug,
      h1: o.h1 || o.title || a.keyword || slug,
      description: resolveDescription(o.meta_description, o.excerpt, firstParagraph(html)),
      image: toAbsolute(image),
      html,
      publishedTime: a.updated_at || a.created_at || null,
      category: a.cluster_context || '',
      schemaJson: a.schema_json || null,
    });
  }

  const blogRows = await sb<Record<string, any>>(
    'blog_posts?published_at=not.is.null&slug=not.is.null&select=slug,title,excerpt,content,cover_url,published_at,tags&order=published_at.desc',
  );
  for (const p of blogRows) {
    const slug = String(p.slug || '');
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const html = cleanArticleHtml(String(p.content || ''));
    out.push({
      slug,
      title: p.title || slug,
      h1: p.title || slug,
      description: resolveDescription(p.excerpt, firstParagraph(html)),
      image: toAbsolute(p.cover_url || ''),
      html,
      publishedTime: p.published_at || null,
      category: Array.isArray(p.tags) ? p.tags[0] || '' : '',
      schemaJson: null,
    });
  }

  return out;
}

// ── HTML building ────────────────────────────────────────────────────────────

const REMOVAL_SCRIPT = `<script>
(function(){
  var el = document.getElementById('prerendered-content');
  var root = document.getElementById('root');
  if (!el || !root) return;
  var obs = new MutationObserver(function(){
    if (root.children.length > 0) { el.remove(); obs.disconnect(); }
  });
  obs.observe(root, { childList: true });
  setTimeout(function(){ if (el.parentNode) el.remove(); obs.disconnect(); }, 5000);
})();
</script>`;

function stripExistingMeta(html: string): string {
  return html
    .replace(/<meta\s+name="description"[^>]*>/g, '')
    .replace(/<link\s+rel="canonical"[^>]*>/g, '')
    .replace(/<meta\s+property="og:(title|description|url|type)"[^>]*>/g, '')
    .replace(/<meta\s+name="twitter:(title|description)"[^>]*>/g, '');
}

interface HeadOptions {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  jsonLd?: Record<string, unknown>[];
}

function buildHead(o: HeadOptions): string {
  const t = escapeAttr(o.title);
  const d = escapeAttr(o.description);
  const url = escapeAttr(o.canonical);
  const img = escapeAttr(o.image || FALLBACK_IMAGE);
  const ld = (o.jsonLd || [])
    .map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`)
    .join('\n  ');

  return `
  <!-- prerendered meta -->
  <meta name="description" content="${d}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="${o.type || 'website'}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${img}" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />
  ${o.publishedTime ? `<meta property="article:published_time" content="${escapeAttr(o.publishedTime)}" />` : ''}
  ${ld}
  <!-- /prerendered meta -->`;
}

function writePage(routePath: string, template: string, head: string, body: string, title: string) {
  let html = stripExistingMeta(template);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`);
  html = html.replace('</head>', `${head}\n</head>`);
  if (body) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="prerendered-content">${body}</div>\n    ${REMOVAL_SCRIPT}\n    <div id="root"></div>`,
    );
  }
  const target =
    routePath === '/' ? resolve(DIST, 'index.html') : resolve(DIST, `.${routePath}`, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, 'utf-8');
}

function articleBody(a: Article, related: Article[]): string {
  const h1 = escapeAttr(a.h1);
  const date = formatDateFr(a.publishedTime);
  const relatedHtml = related.length
    ? `<section><h2>Articles similaires</h2><ul>${related
        .map((r) => `<li><a href="/blog/${r.slug}">${escapeAttr(r.title)}</a></li>`)
        .join('')}</ul></section>`
    : '';

  return `<div style="max-width:768px;margin:0 auto;padding:32px 20px;line-height:1.7">
    <nav aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <a href="/blog">Blog</a> › <span>${h1}</span></nav>
    <h1>${h1}</h1>
    <p>${date ? `${date} · ` : ''}${readTime(a.html)} min de lecture · ${SITE_NAME}</p>
    ${a.image !== FALLBACK_IMAGE ? `<img src="${escapeAttr(a.image)}" alt="${h1}" width="1200" height="630" style="width:100%;height:auto" />` : ''}
    <article>${a.html}</article>
    ${relatedHtml}
  </div>`;
}

function hubBody(articles: Article[]): string {
  return `<div style="max-width:768px;margin:0 auto;padding:32px 20px;line-height:1.7">
    <nav aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <span>Blog</span></nav>
    <h1>Blog NutriZen</h1>
    <p>Conseils nutrition, astuces cuisine et guides pratiques — ${articles.length} articles.</p>
    <ul>${articles
      .map(
        (a) =>
          `<li><a href="/blog/${a.slug}">${escapeAttr(a.title)}</a><br/><span>${escapeAttr(truncate(a.description, 120))}</span></li>`,
      )
      .join('')}</ul>
  </div>`;
}

// ── static routes ────────────────────────────────────────────────────────────

const STATIC_ROUTES: { path: string; title: string; description: string }[] = [
  {
    path: '/fit',
    title: 'NutriZen Fit — Menus sportifs personnalisés',
    description:
      'Menus adaptés à la performance et à la prise de masse : macros calculées, recettes rapides et liste de courses automatique.',
  },
  {
    path: '/mum',
    title: 'NutriZen Mum — Menus faciles pour toute la famille',
    description:
      'Des menus équilibrés pensés pour les familles : repas rapides, portions adaptées aux enfants et courses simplifiées.',
  },
  {
    path: '/pro',
    title: 'NutriZen Pro — Menus pour professionnels pressés',
    description:
      'Des repas sains même avec un agenda chargé : batch cooking, recettes express et liste de courses générée automatiquement.',
  },
  {
    path: '/contact',
    title: 'Contact — NutriZen',
    description: 'Une question sur vos menus, votre abonnement ou votre compte ? Contactez l’équipe NutriZen.',
  },
  {
    path: '/a-propos',
    title: 'À propos de NutriZen',
    description: 'Notre mission : rendre la nutrition personnalisée simple, accessible et durable au quotidien.',
  },
  {
    path: '/legal/mentions',
    title: 'Mentions légales — NutriZen',
    description: 'Mentions légales et informations sur l’éditeur du service NutriZen.',
  },
  {
    path: '/legal/cgv',
    title: 'Conditions générales de vente — NutriZen',
    description: 'Conditions générales de vente et d’utilisation des abonnements NutriZen.',
  },
  {
    path: '/legal/confidentialite',
    title: 'Politique de confidentialité — NutriZen',
    description: 'Comment NutriZen collecte, utilise et protège vos données personnelles.',
  },
  {
    path: '/legal/resiliation',
    title: 'Résiliation — NutriZen',
    description: 'Comment résilier votre abonnement NutriZen en quelques clics.',
  },
];

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const templatePath = resolve(DIST, 'index.html');
  const template = readFileSync(templatePath, 'utf-8');

  const homeTitle = 'NutriZen — Menus nutritionnels personnalisés sur-mesure';
  const homeDesc =
    'Menus nutritionnels personnalisés selon vos objectifs. Plan sur-mesure en 30s + liste de courses automatique.';

  writePage(
    '/',
    template,
    buildHead({
      title: homeTitle,
      description: homeDesc,
      canonical: `${SITE_URL}/`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/icons/icon-192.png`,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          inLanguage: 'fr',
        },
      ],
    }),
    '',
    homeTitle,
  );

  for (const r of STATIC_ROUTES) {
    writePage(
      r.path,
      template,
      buildHead({ title: r.title, description: r.description, canonical: `${SITE_URL}${r.path}` }),
      '',
      r.title,
    );
  }

  const allArticles = await fetchArticles();
  const articles = allArticles.slice(0, MAX_PRERENDERED_ARTICLES);

  const hubTitle = 'Blog NutriZen — Conseils nutrition & recettes healthy';
  writePage(
    '/blog',
    template,
    buildHead({
      title: hubTitle,
      description: `Découvrez nos ${articles.length} articles nutrition, astuces cuisine et guides pratiques pour manger sainement au quotidien.`,
      canonical: `${SITE_URL}/blog`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: hubTitle,
          url: `${SITE_URL}/blog`,
          inLanguage: 'fr',
        },
      ],
    }),
    hubBody(articles),
    hubTitle,
  );

  for (const a of articles) {
    const canonical = `${SITE_URL}/blog/${a.slug}`;
    const related = articles
      .filter((x) => x.slug !== a.slug && (!a.category || x.category === a.category))
      .slice(0, 3);
    const jsonLd: Record<string, unknown>[] = [
      a.schemaJson || {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.h1,
        description: a.description,
        image: a.image,
        url: canonical,
        datePublished: a.publishedTime,
        author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-192.png` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        inLanguage: 'fr',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: a.h1, item: canonical },
        ],
      },
    ];

    writePage(
      `/blog/${a.slug}`,
      template,
      buildHead({
        title: `${a.title} — ${SITE_NAME}`,
        description: a.description,
        canonical,
        image: a.image,
        type: 'article',
        publishedTime: a.publishedTime,
        jsonLd,
      }),
      articleBody(a, related),
      `${a.title} — ${SITE_NAME}`,
    );
  }

  console.log(
    `[prerender] ${1 + STATIC_ROUTES.length + 1 + articles.length} pages written (${articles.length} articles)`,
  );
  if (allArticles.length > articles.length) {
    console.warn(`[prerender] capped: ${allArticles.length - articles.length} articles not prerendered`);
  }
}

main().catch((err) => {
  console.error('[prerender] Fatal error:', err);
  process.exit(1);
});

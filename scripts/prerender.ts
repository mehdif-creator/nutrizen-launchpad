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
import { resolveContextualCtaCopy } from '../src/lib/blog/cta';
import socialPreviewAsset from '../src/assets/nutrizen-og-v3.jpg.asset.json';

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
    // interactive widgets are React-only; the static reference tables stay
    .replace(/\{\{PASTA_CALCULATOR\}\}/g, '')
    .replace(/\{\{IMAGE_\d+_URL\}\}/g, '')
    .replace(/\{\{IMAGE_\d+_ALT\}\}/g, '')
    .replace(/\{\{NUTRIZEN_CTA_URL\}\}/g, `${SITE_URL}/`)
    .replace(
      /<figure[^>]*>\s*<img[^>]*src=""[^>]*\/?>\s*(?:<figcaption[^>]*>.*?<\/figcaption>\s*)?<\/figure>/gi,
      '',
    )
    .replace(/<img[^>]*src=""[^>]*\/?>/gi, '')
    // one H1 per page: the page title owns it, body headings start at H2
    .replace(/<h1(\s[^>]*)?>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>');
}

function resolveImagePlaceholders(html: string, images: unknown[], title = ''): string {
  let out = html;
  images.forEach((img, i) => {
    const n = i + 1;
    const url = (typeof img === 'string' ? img : ((img as { url?: string })?.url ?? '')).trim();
    const alt =
      (typeof img === 'string' ? '' : ((img as { alt?: string })?.alt ?? '')) || title;
    if (url) {
      // Same output as BlogPost.tsx: attribute placeholders get the URL, standalone
      // placeholders become a real <figure><img>, never a bare URL in the body text.
      out = out.split(`src="{{IMAGE_${n}_URL}}"`).join(`src="${url}"`);
      out = out.split(`src='{{IMAGE_${n}_URL}}'`).join(`src="${url}"`);
      const inlineImage = `<figure class="my-6"><img src="${url}" alt="${escapeAttr(alt)}" loading="lazy" class="w-full rounded-xl object-cover" /></figure>`;
      out = out.split(`{{IMAGE_${n}_URL}}`).join(inlineImage);
    }
    if (alt) out = out.split(`{{IMAGE_${n}_ALT}}`).join(escapeAttr(alt));
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
  /** 2–4 sentence answer shown before the long-form content. */
  quickAnswer: string;
  image: string;
  html: string;
  datePublished: string | null;
  dateModified: string | null;
  author: string;
  category: string;
  faq: { q: string; a: string }[];
}

/** FAQ actually visible in the article HTML (<details><summary>…). */
function extractVisibleFaq(html: string): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  const blocks = html.match(/<details[\s\S]*?<\/details>/gi) || [];
  for (const block of blocks) {
    const sum = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    if (!sum) continue;
    const q = stripHtml(sum[1]);
    const a = stripHtml(block.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, ''));
    if (q.length > 5 && a.length > 15) out.push({ q, a });
  }
  return out;
}

async function fetchArticles(): Promise<Article[]> {
  const out: Article[] = [];
  const seen = new Set<string>();

  // No server-side `order` here: sorting these wide rows in Postgres hits the
  // PostgREST statement timeout. We fetch then sort locally (same result).
  const seoRows = (
    await sb<Record<string, any>>(
      'seo_articles?status=eq.published&slug=not.is.null&redirect_to_slug=is.null&select=slug,keyword,outline,draft_meta,image_urls,draft_html,cluster_context,updated_at,created_at',
    )
  ).sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  for (const a of seoRows) {
    const slug = String(a.slug || '');
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const o = a.outline || {};
    const meta = a.draft_meta || {};
    const images: unknown[] = Array.isArray(a.image_urls) ? a.image_urls : [];
    let html = String(a.draft_html || '');
    const articleTitleForAlt = String((a.outline || {}).h1 || (a.outline || {}).title || a.keyword || slug);
    html = cleanArticleHtml(resolveImagePlaceholders(html, images, articleTitleForAlt));
    const first = images[0];
    const image = (typeof first === 'string' ? first : (first as { url?: string })?.url) || '';
    const visibleFaq = extractVisibleFaq(html);
    const metaFaq: { q: string; a: string }[] = Array.isArray(meta.faq) ? meta.faq : [];
    out.push({
      slug,
      title: o.meta_title || o.title || o.h1 || a.keyword || slug,
      h1: o.h1 || o.title || a.keyword || slug,
      description: resolveDescription(o.meta_description, o.excerpt, firstParagraph(html)),
      quickAnswer: stripHtml(String(meta.quick_answer || o.quick_answer || o.excerpt || '')),
      image: toAbsolute(image),
      html,
      datePublished: a.created_at || a.updated_at || null,
      dateModified: a.updated_at || a.created_at || null,
      author: 'NutriZen',
      category: a.cluster_context || '',
      faq: visibleFaq.length ? visibleFaq : metaFaq,
    });
  }

  const blogRows = await sb<Record<string, any>>(
    'blog_posts?published_at=not.is.null&slug=not.is.null&select=slug,title,excerpt,content,cover_url,published_at,created_at,author,tags&order=published_at.desc',
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
      quickAnswer: stripHtml(String(p.excerpt || '')),
      image: toAbsolute(p.cover_url || ''),
      html,
      datePublished: p.published_at || p.created_at || null,
      dateModified: p.published_at || null,
      author: p.author || 'NutriZen',
      category: Array.isArray(p.tags) ? p.tags[0] || '' : '',
      faq: extractVisibleFaq(html),
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
    .replace(/<meta\b(?=[^>]*\bname="description")[^>]*>/g, '')
    .replace(/<link\b(?=[^>]*\brel="canonical")[^>]*>/g, '')
    .replace(/<meta\b(?=[^>]*\bproperty="og:(title|description|url|type|site_name|image(?::(?:width|height|type|alt))?)")[^>]*>/g, '')
    .replace(/<meta\b(?=[^>]*\bname="twitter:(card|site|title|description|image)")[^>]*>/g, '');
}

interface HeadOptions {
  title: string;
  description: string;
  ogTitle?: string;
  canonical: string;
  image?: string;
  imageAlt?: string;
  imageType?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  author?: string;
  jsonLd?: Record<string, unknown>[];
}

function buildHead(o: HeadOptions): string {
  const t = escapeAttr(o.title);
  const socialTitle = escapeAttr(o.ogTitle || o.title);
  const d = escapeAttr(o.description);
  const url = escapeAttr(o.canonical);
  const img = escapeAttr(o.image || FALLBACK_IMAGE);
  const imageAlt = o.imageAlt ? escapeAttr(o.imageAlt) : null;
  const ld = (o.jsonLd || [])
    .map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`)
    .join('\n  ');

  return `
  <!-- prerendered meta -->
  <meta data-rh="true" name="description" content="${d}" />
  <meta name="robots" content="index, follow" />
  <link data-rh="true" rel="canonical" href="${url}" />
  <meta data-rh="true" property="og:type" content="${o.type || 'website'}" />
  <meta data-rh="true" property="og:url" content="${url}" />
  <meta data-rh="true" property="og:title" content="${socialTitle}" />
  <meta data-rh="true" property="og:description" content="${d}" />
  <meta data-rh="true" property="og:image" content="${img}" />
  ${o.imageWidth ? `<meta data-rh="true" property="og:image:width" content="${o.imageWidth}" />` : ''}
  ${o.imageHeight ? `<meta data-rh="true" property="og:image:height" content="${o.imageHeight}" />` : ''}
  ${o.imageType ? `<meta data-rh="true" property="og:image:type" content="${escapeAttr(o.imageType)}" />` : ''}
  ${imageAlt ? `<meta data-rh="true" property="og:image:alt" content="${imageAlt}" />` : ''}
  <meta data-rh="true" property="og:site_name" content="${SITE_NAME}" />
  <meta data-rh="true" name="twitter:card" content="summary_large_image" />
  <meta data-rh="true" name="twitter:title" content="${socialTitle}" />
  <meta data-rh="true" name="twitter:description" content="${d}" />
  <meta data-rh="true" name="twitter:image" content="${img}" />
  ${o.publishedTime ? `<meta property="article:published_time" content="${escapeAttr(o.publishedTime)}" />` : ''}
  ${o.modifiedTime ? `<meta property="article:modified_time" content="${escapeAttr(o.modifiedTime)}" />` : ''}
  ${o.author ? `<meta name="author" content="${escapeAttr(o.author)}" />` : ''}
  ${ld}
  <!-- /prerendered meta -->`;
}

function writePage(
  routePath: string,
  template: string,
  head: string,
  body: string,
  title: string,
  bodyInsideRoot = false,
) {
  let html = stripExistingMeta(template);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`);
  html = html.replace('</head>', `${head}\n</head>`);
  if (body) {
    html = bodyInsideRoot
      ? html.replace(
          '<div id="root"></div>',
          `<div id="root"><div id="prerendered-content">${body}</div></div>`,
        )
      : html.replace(
          '<div id="root"></div>',
          `<div id="prerendered-content">${body}</div>\n    <div id="root"></div>\n    ${REMOVAL_SCRIPT}`,
        );
  }
  const target =
    routePath === '/' ? resolve(DIST, 'index.html') : resolve(DIST, `.${routePath}`, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, 'utf-8');
}

/** Splits long HTML at the <h2> closest to the middle (for one inline CTA). */
function splitAtMiddleHeading(html: string): [string, string] {
  if (!html || html.length < 6000) return [html, ''];
  const positions: number[] = [];
  const re = /<h2[\s>]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) positions.push(m.index);
  if (positions.length < 4) return [html, ''];
  const mid = html.length / 2;
  const target = positions
    .slice(1, -1)
    .reduce((best, p) => (Math.abs(p - mid) < Math.abs(best - mid) ? p : best), positions[1]);
  return [html.slice(0, target), html.slice(target)];
}

function contextualCtaHtml(topic: string): string {
  const c = resolveContextualCtaCopy(topic);
  return `<aside class="nz-inline-cta"><p><strong>${escapeAttr(c.headline)}</strong></p><p>${escapeAttr(c.body)}</p><p><a href="${c.to}">${escapeAttr(c.action)}</a></p></aside>`;
}

function articleBody(a: Article, related: Article[]): string {
  const h1 = escapeAttr(a.h1);
  const dateLabel = formatDateFr(a.datePublished);
  const modifiedLabel = formatDateFr(a.dateModified);
  const [before, after] = splitAtMiddleHeading(a.html);
  const relatedHtml = related.length
    ? `<section><h2>À lire aussi sur le même sujet</h2><ul>${related
        .map((r) => `<li><a href="/blog/${r.slug}">${escapeAttr(r.title)}</a></li>`)
        .join('')}</ul></section>`
    : '';
  const quickAnswer =
    a.quickAnswer && a.quickAnswer.length > 60
      ? `<aside aria-label="Réponse rapide"><h2>Réponse rapide</h2><p>${escapeAttr(a.quickAnswer)}</p></aside>`
      : '';

  return `<div style="max-width:768px;margin:0 auto;padding:32px 20px;line-height:1.7">
    <nav aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <a href="/blog">Blog</a> › <span>${h1}</span></nav>
    <article>
      <header>
        <h1>${h1}</h1>
        <p>
          ${a.datePublished ? `Publié le <time datetime="${escapeAttr(a.datePublished)}">${dateLabel}</time>` : ''}
          ${a.dateModified && a.dateModified !== a.datePublished ? ` · Mis à jour le <time datetime="${escapeAttr(a.dateModified)}">${modifiedLabel}</time>` : ''}
          · ${readTime(a.html)} min de lecture · Par <span>${escapeAttr(a.author)}</span>
        </p>
      </header>
      ${a.image !== FALLBACK_IMAGE ? `<img src="${escapeAttr(a.image)}" alt="${h1}" width="1200" height="630" style="width:100%;height:auto" />` : ''}
      ${quickAnswer}
      ${before}
      ${after ? contextualCtaHtml(a.h1) + after : ''}
    </article>
    ${relatedHtml}
  </div>`;
}


function hubBody(articles: Article[]): string {
  return `<main class="container py-16">
    <div class="max-w-5xl mx-auto">
      <header class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-3 text-foreground">Blog NutriZen</h1>
        <p class="text-lg text-muted-foreground">Conseils nutrition, astuces cuisine et guides pratiques</p>
      </header>
      <p class="text-sm text-muted-foreground mb-6">${articles.length} articles</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${articles
      .map(
        (a) => `<a href="/blog/${a.slug}" class="group block">
          <article class="border border-border rounded-2xl overflow-hidden bg-card flex flex-col h-full">
            ${
              a.image !== FALLBACK_IMAGE
                ? `<div class="h-[200px] overflow-hidden flex-shrink-0"><img src="${escapeAttr(a.image)}" alt="${escapeAttr(a.h1)}" loading="lazy" width="800" height="450" class="w-full h-full object-cover" /></div>`
                : '<div class="h-[200px] bg-secondary" aria-hidden="true"></div>'
            }
            <div class="p-5 flex-1 flex flex-col">
              ${a.category ? `<span class="text-xs font-semibold text-primary mb-2">${escapeAttr(a.category)}</span>` : ''}
              <h2 class="text-[1.0625rem] font-bold text-foreground mb-2.5 leading-snug">${escapeAttr(a.title)}</h2>
              <p class="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">${escapeAttr(truncate(a.description, 150))}</p>
            </div>
          </article>
        </a>`,
      )
      .join('')}</div>
    </div>
  </main>`;
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
    'NutriZen crée vos menus personnalisés, vos recettes et votre liste de courses en quelques minutes. Moins de charge mentale, moins d’improvisation.';

  writePage(
    '/',
    template,
    buildHead({
      title: homeTitle,
      description: homeDesc,
      ogTitle: 'Vos menus de la semaine en 2 minutes | NutriZen',
      canonical: `${SITE_URL}/`,
      image: `${SITE_URL}${socialPreviewAsset.url}`,
      imageAlt: 'NutriZen organise vos menus, recettes et liste de courses de la semaine',
      imageType: 'image/jpeg',
      imageWidth: 1200,
      imageHeight: 630,
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
      buildHead({
        title: r.title,
        description: r.description,
        canonical: `${SITE_URL}${r.path}`,
        image: `${SITE_URL}${socialPreviewAsset.url}`,
        imageAlt: 'NutriZen organise vos menus, recettes et liste de courses de la semaine',
        imageType: 'image/jpeg',
        imageWidth: 1200,
        imageHeight: 630,
      }),
      '',
      r.title,
    );
  }

  const allArticles = await fetchArticles();
  const articles = allArticles.slice(0, MAX_PRERENDERED_ARTICLES);

  const hubTitle = 'Blog NutriZen — Conseils nutrition & recettes healthy';
  const hubTemplate = template.replace(
    /\s*<noscript>\s*<div style="padding:2rem;text-align:center;font-family:sans-serif;">\s*<p><strong>JavaScript requis<\/strong><\/p>\s*<p>NutriZen nécessite JavaScript pour fonctionner\. Merci de l'activer dans les paramètres de votre navigateur\.<\/p>\s*<\/div>\s*<\/noscript>/,
    '',
  );
  writePage(
    '/blog',
    hubTemplate,
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
    true,
  );

  const tokens = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3),
    );

  for (const a of articles) {
    const canonical = `${SITE_URL}/blog/${a.slug}`;
    const own = tokens(a.h1);
    const related = articles
      .filter((x) => x.slug !== a.slug)
      .map((x) => {
        const shared = [...tokens(x.h1)].filter((w) => own.has(w)).length;
        return { x, score: shared * 2 + (a.category && x.category === a.category ? 1 : 0) };
      })
      .sort((p, q) => q.score - p.score)
      .slice(0, 3)
      .map((r) => r.x);

    const jsonLd: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: a.h1,
        description: a.description,
        image: a.image,
        url: canonical,
        datePublished: a.datePublished,
        dateModified: a.dateModified || a.datePublished,
        author: { '@type': 'Organization', name: a.author || SITE_NAME, url: SITE_URL },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-192.png` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        inLanguage: 'fr-FR',
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

    // FAQPage only when the page really shows those questions
    if (a.faq.length > 0) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: a.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      });
    }

    writePage(
      `/blog/${a.slug}`,
      template,
      buildHead({
        title: `${a.title} — ${SITE_NAME}`,
        description: a.description,
        canonical,
        image: a.image,
        type: 'article',
        publishedTime: a.datePublished,
        modifiedTime: a.dateModified,
        author: a.author,
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

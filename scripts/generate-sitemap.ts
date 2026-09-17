/**
 * Generates public/sitemap.xml before dev and build.
 * Includes every public static route plus every published article
 * (seo_articles + blog_posts), with a real per-page lastmod.
 */

import { writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pghdaozgxkbtsxwydemd.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGRhb3pneGtidHN4d3lkZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODI2MDUsImV4cCI6MjA3NjA1ODYwNX0.i0GjjZ6Ojt-79KdI2pqRz6Z-RVhGvH7fOfAUdXCVrfU';

const DOMAIN = 'https://mynutrizen.fr';

interface Entry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const staticPages: Entry[] = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/fit', changefreq: 'monthly', priority: '0.8' },
  { loc: '/mum', changefreq: 'monthly', priority: '0.8' },
  { loc: '/pro', changefreq: 'monthly', priority: '0.8' },
  { loc: '/a-propos', changefreq: 'yearly', priority: '0.5' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.7' },
  { loc: '/blog', changefreq: 'weekly', priority: '0.7' },
  { loc: '/legal/mentions', changefreq: 'yearly', priority: '0.3' },
  { loc: '/legal/cgv', changefreq: 'yearly', priority: '0.3' },
  { loc: '/legal/confidentialite', changefreq: 'yearly', priority: '0.3' },
  { loc: '/legal/resiliation', changefreq: 'yearly', priority: '0.3' },
];

function buildUrlEntry(e: Entry): string {
  return [
    '  <url>',
    `    <loc>${DOMAIN}${e.loc}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function sb<T = Record<string, unknown>>(path: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) {
    console.warn(`[sitemap] Supabase ${path} → ${res.status}`);
    return [];
  }
  return (await res.json()) as T[];
}

async function main() {
  console.log('[sitemap] Generating sitemap...');

  const seen = new Set<string>();
  const blogEntries: string[] = [];

  const seoArticles = await sb<Record<string, any>>(
    'seo_articles?status=eq.published&slug=not.is.null&select=slug,updated_at,created_at&order=updated_at.desc',
  );
  for (const a of seoArticles) {
    const slug = String(a.slug || '');
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const lastmod = (a.updated_at || a.created_at || '').substring(0, 10) || undefined;
    blogEntries.push(buildUrlEntry({ loc: `/blog/${slug}`, lastmod, changefreq: 'monthly', priority: '0.6' }));
  }

  const blogPosts = await sb<Record<string, any>>(
    'blog_posts?published_at=not.is.null&slug=not.is.null&select=slug,published_at,created_at&order=published_at.desc',
  );
  for (const p of blogPosts) {
    const slug = String(p.slug || '');
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const lastmod = (p.published_at || p.created_at || '').substring(0, 10) || undefined;
    blogEntries.push(buildUrlEntry({ loc: `/blog/${slug}`, lastmod, changefreq: 'monthly', priority: '0.6' }));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages.map(buildUrlEntry), ...blogEntries].join('\n')}
</urlset>`;

  const outPath = resolve(__dirname, '..', 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`[sitemap] Written to ${outPath} (${staticPages.length} static + ${blogEntries.length} articles)`);
}

main().catch((err) => {
  console.error('[sitemap] Fatal error:', err);
  process.exit(1);
});

import { createClient } from '../_shared/deps.ts';

const SITE = 'https://mynutrizen.fr';

const STATIC_PAGES = [
  { path: '/',                        lastmod: '2025-01-15', changefreq: 'weekly',   priority: '1.0' },
  { path: '/fit',                     lastmod: '2025-01-15', changefreq: 'monthly',  priority: '0.8' },
  { path: '/mum',                     lastmod: '2025-01-15', changefreq: 'monthly',  priority: '0.8' },
  { path: '/pro',                     lastmod: '2025-01-15', changefreq: 'monthly',  priority: '0.8' },
  { path: '/contact',                 lastmod: '2025-01-15', changefreq: 'monthly',  priority: '0.7' },
  { path: '/blog',                    lastmod: '2025-01-15', changefreq: 'weekly',   priority: '0.7' },
  { path: '/a-propos',                lastmod: '2025-01-15', changefreq: 'yearly',   priority: '0.5' },
  { path: '/legal/mentions',          lastmod: '2025-01-15', changefreq: 'yearly',   priority: '0.3' },
  { path: '/legal/cgv',              lastmod: '2025-01-15', changefreq: 'yearly',   priority: '0.3' },
  { path: '/legal/confidentialite',  lastmod: '2025-01-15', changefreq: 'yearly',   priority: '0.3' },
  { path: '/legal/resiliation',      lastmod: '2025-01-15', changefreq: 'yearly',   priority: '0.3' },
];

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

Deno.serve(async (_req) => {
  const entries: string[] = [];

  for (const p of STATIC_PAGES) {
    entries.push(urlEntry(`${SITE}${p.path}`, p.lastmod, p.changefreq, p.priority));
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);
    const addedSlugs = new Set<string>();

    // 1. seo_articles — use the new slug column directly
    //    Consolidated duplicates (redirect_to_slug) must stay out of the sitemap.
    const { data: seoArticles, error: seoErr } = await admin
      .from('seo_articles')
      .select('slug, updated_at, created_at')
      .eq('status', 'published')
      .is('redirect_to_slug', null)
      .not('slug', 'is', null);

    if (seoErr) console.error('[sitemap] seo_articles error:', seoErr.message);

    if (seoArticles) {
      for (const a of seoArticles) {
        const slug = a.slug as string;
        if (!slug || addedSlugs.has(slug)) continue;
        addedSlugs.add(slug);
        const date = ((a.updated_at || a.created_at || '2025-01-15') as string).substring(0, 10);
        entries.push(urlEntry(`${SITE}/blog/${slug}`, date, 'weekly', '0.6'));
      }
    }

    // 2. blog_posts
    const { data: blogPosts, error: blogErr } = await admin
      .from('blog_posts')
      .select('slug, published_at, created_at')
      .not('published_at', 'is', null)
      .not('slug', 'is', null);

    if (blogErr) console.error('[sitemap] blog_posts error:', blogErr.message);

    if (blogPosts) {
      for (const p of blogPosts) {
        if (!p.slug || addedSlugs.has(p.slug)) continue;
        addedSlugs.add(p.slug);
        const date = ((p.published_at || p.created_at || '2025-01-15') as string).substring(0, 10);
        entries.push(urlEntry(`${SITE}/blog/${p.slug}`, date, 'monthly', '0.6'));
      }
    }

    console.log(`[sitemap] Total URLs: ${entries.length} (${STATIC_PAGES.length} static + ${addedSlugs.size} blog)`);
  } catch (err) {
    console.error('[sitemap] Error:', err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'CDN-Cache-Control': 'public, max-age=3600',
    },
  });
});

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

function toSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

Deno.serve(async (_req) => {
  const entries: string[] = [];

  // Static pages
  for (const p of STATIC_PAGES) {
    entries.push(urlEntry(`${SITE}${p.path}`, p.lastmod, p.changefreq, p.priority));
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch published seo_articles
    const { data: seoArticles, error: seoErr } = await admin
      .from('seo_articles')
      .select('id, keyword, outline, updated_at, created_at, blog_post_id')
      .eq('status', 'published');

    if (seoErr) {
      console.error('[sitemap] seo_articles error:', seoErr.message);
    }

    // Track slugs we've already added to avoid duplicates
    const addedSlugs = new Set<string>();

    if (seoArticles && seoArticles.length > 0) {
      console.log(`[sitemap] Found ${seoArticles.length} published seo_articles`);
      for (const article of seoArticles) {
        const outline = article.outline as Record<string, unknown> | null;
        const slug = (outline?.slug as string) || toSlug(article.keyword || '');
        if (!slug) continue;
        if (addedSlugs.has(slug)) continue;
        addedSlugs.add(slug);
        const date = ((article.updated_at || article.created_at || '2025-01-15') as string).substring(0, 10);
        entries.push(urlEntry(`${SITE}/blog/${slug}`, date, 'weekly', '0.6'));
      }
    }

    // 2. Fetch published blog_posts (manual posts)
    const { data: blogPosts, error: blogErr } = await admin
      .from('blog_posts')
      .select('slug, published_at, created_at')
      .not('published_at', 'is', null)
      .not('slug', 'is', null);

    if (blogErr) {
      console.error('[sitemap] blog_posts error:', blogErr.message);
    }

    if (blogPosts && blogPosts.length > 0) {
      console.log(`[sitemap] Found ${blogPosts.length} published blog_posts`);
      for (const post of blogPosts) {
        if (!post.slug || addedSlugs.has(post.slug)) continue;
        addedSlugs.add(post.slug);
        const date = ((post.published_at || post.created_at || '2025-01-15') as string).substring(0, 10);
        entries.push(urlEntry(`${SITE}/blog/${post.slug}`, date, 'monthly', '0.6'));
      }
    }

    console.log(`[sitemap] Total URLs: ${entries.length} (${STATIC_PAGES.length} static + ${addedSlugs.size} blog)`);
  } catch (err) {
    console.error('[sitemap] Error fetching articles:', err);
    // Continue with static-only entries already added
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

import { createClient } from '../_shared/deps.ts';

const SITE = 'https://mynutrizen.fr';

const STATIC_PAGES = [
  { path: '/',                        lastmod: '2025-01-15', changefreq: 'weekly',   priority: '1.0' },
  { path: '/fit',                     lastmod: '2025-01-15', changefreq: 'monthly',  priority: '0.8' },
  { path: '/mum',                     lastmod: '2025-01-15', changefreq: 'monthly',  priority: '0.8' },
  { path: '/pro',                     lastmod: '2025-01-15', changefreq: 'monthly',  priority: '0.8' },
  { path: '/contact',                 lastmod: '2025-01-15', changefreq: 'monthly',  priority: '0.7' },
  { path: '/blog',                    lastmod: '2025-01-15', changefreq: 'weekly',   priority: '0.7' },
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
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch published blog posts
    const { data: blogPosts } = await admin
      .from('blog_posts')
      .select('slug, published_at, created_at')
      .not('slug', 'is', null)
      .order('created_at', { ascending: false });

    // Also fetch published seo_articles that have been linked to blog_posts
    const { data: seoArticles } = await admin
      .from('seo_articles')
      .select('keyword, updated_at, blog_post_id')
      .eq('status', 'published')
      .not('blog_post_id', 'is', null);

    // Build XML
    const entries: string[] = [];

    // Static pages
    for (const p of STATIC_PAGES) {
      entries.push(urlEntry(`${SITE}${p.path}`, p.lastmod, p.changefreq, p.priority));
    }

    // Blog posts
    if (blogPosts) {
      for (const post of blogPosts) {
        if (!post.slug) continue;
        const date = (post.published_at || post.created_at || '2025-01-15').substring(0, 10);
        entries.push(urlEntry(`${SITE}/blog/${post.slug}`, date, 'monthly', '0.6'));
      }
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
      },
    });
  } catch (err) {
    console.error('[sitemap] Error:', err);
    // Fallback: return static-only sitemap
    const entries = STATIC_PAGES.map(p =>
      urlEntry(`${SITE}${p.path}`, p.lastmod, p.changefreq, p.priority)
    );
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
    return new Response(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
});

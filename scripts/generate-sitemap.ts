import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pghdaozgxkbtsxwydemd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const DOMAIN = 'https://mynutrizen.fr';

interface StaticPage {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

const staticPages: StaticPage[] = [
  { loc: '/', lastmod: '2025-01-15', changefreq: 'weekly', priority: '1.0' },
  { loc: '/fit', lastmod: '2025-01-15', changefreq: 'monthly', priority: '0.8' },
  { loc: '/mum', lastmod: '2025-01-15', changefreq: 'monthly', priority: '0.8' },
  { loc: '/pro', lastmod: '2025-01-15', changefreq: 'monthly', priority: '0.8' },
  { loc: '/contact', lastmod: '2025-01-15', changefreq: 'monthly', priority: '0.7' },
  { loc: '/blog', lastmod: '2025-01-15', changefreq: 'weekly', priority: '0.7' },
  { loc: '/legal/mentions', lastmod: '2025-01-15', changefreq: 'yearly', priority: '0.3' },
  { loc: '/legal/cgv', lastmod: '2025-01-15', changefreq: 'yearly', priority: '0.3' },
  { loc: '/legal/confidentialite', lastmod: '2025-01-15', changefreq: 'yearly', priority: '0.3' },
  { loc: '/legal/resiliation', lastmod: '2025-01-15', changefreq: 'yearly', priority: '0.3' },
];

function buildUrlEntry(page: StaticPage): string {
  return `  <url>
    <loc>${DOMAIN}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
}

async function main() {
  console.log('[sitemap] Generating sitemap...');

  let blogEntries: string[] = [];

  if (SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('slug, published_at, created_at')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });

      if (error) {
        console.warn('[sitemap] Could not fetch blog posts:', error.message);
      } else if (posts?.length) {
        console.log(`[sitemap] Found ${posts.length} published blog posts`);
        blogEntries = posts.map((post) => {
          const lastmod = (post.published_at || post.created_at || '2025-01-15').substring(0, 10);
          return buildUrlEntry({
            loc: `/blog/${post.slug}`,
            lastmod,
            changefreq: 'monthly',
            priority: '0.6',
          });
        });
      }
    } catch (err) {
      console.warn('[sitemap] Supabase connection failed, generating static-only sitemap:', err);
    }
  } else {
    console.warn('[sitemap] No Supabase anon key found, generating static-only sitemap');
  }

  const staticEntries = staticPages.map(buildUrlEntry);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...blogEntries].join('\n')}
</urlset>`;

  const outPath = resolve(__dirname, '..', 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`[sitemap] Written to ${outPath} (${staticPages.length} static + ${blogEntries.length} blog)`);
}

main().catch((err) => {
  console.error('[sitemap] Fatal error:', err);
  process.exit(1);
});

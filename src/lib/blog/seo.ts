/**
 * Blog SEO helpers shared by the React article page.
 * Everything here derives from content that is actually visible to users —
 * no fabricated metadata, dates or FAQ entries.
 */

export interface FaqEntry {
  q: string;
  a: string;
}

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Extracts the FAQ that is genuinely rendered in the article HTML
 * (`<details><summary>question</summary>answer</details>`).
 */
export function extractVisibleFaq(html: string): FaqEntry[] {
  const out: FaqEntry[] = [];
  const blocks = html.match(/<details[\s\S]*?<\/details>/gi) || [];
  for (const block of blocks) {
    const sum = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    if (!sum) continue;
    const q = stripTags(sum[1]);
    const a = stripTags(block.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, ''));
    if (q.length > 5 && a.length > 15) out.push({ q, a });
  }
  return out;
}

/** Builds FAQPage JSON-LD from visible questions only. */
export function buildFaqJsonLd(faq: FaqEntry[]): Record<string, unknown> | null {
  if (faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  site: string,
  title: string,
  slug: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${site}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${site}/blog` },
      { '@type': 'ListItem', position: 3, name: title, item: `${site}/blog/${slug}` },
    ],
  };
}

/**
 * Splits long article HTML at the `<h2>` closest to the middle so a single
 * contextual CTA can be inserted between two real sections.
 * Returns `[html, '']` when the article is too short to justify it.
 */
export function splitAtMiddleHeading(html: string): [string, string] {
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

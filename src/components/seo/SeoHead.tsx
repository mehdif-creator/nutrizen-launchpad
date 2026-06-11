import { Helmet } from 'react-helmet-async';

const SITE = 'https://mynutrizen.fr';
const DEFAULT_OG = `${SITE}/img/og-default.png`;

export interface SeoHeadProps {
  title: string;
  description: string;
  /** Path beginning with `/` or absolute URL. Defaults to current route at render time. */
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Dynamic per-route SEO head powered by react-helmet-async.
 * Overrides any matching tags from index.html for JS-executing crawlers.
 */
export function SeoHead({
  title,
  description,
  canonicalPath,
  ogImage = DEFAULT_OG,
  ogType = 'website',
  noIndex = false,
  jsonLd,
}: SeoHeadProps) {
  const path =
    canonicalPath ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');
  const canonical = path.startsWith('http') ? path : `${SITE}${path}`;
  const image = ogImage.startsWith('http') ? ogImage : `${SITE}${ogImage}`;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="NutriZen" />
      <meta property="og:locale" content="fr_FR" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}

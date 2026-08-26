// Single source of truth for how the site's URLs are assembled. The site
// supports two deployments: a root user page (https://user.github.io/) and a
// project page (https://user.github.io/repository/). Canonical metadata, OG
// images, robots, sitemap, and JSON-LD must all agree, so they share this.
export interface SiteConfig {
  /** Origin without a trailing slash, e.g. https://user.github.io */
  origin: string;
  /** Normalized base path with a leading slash, e.g. /repository or "" */
  base: string;
  /** The canonical root URL of this deployment (with trailing slash). */
  rootUrl: string;
  /** Canonical path of the root page, for use with Next metadata. */
  canonicalPath: string;
  sitemapUrl: string;
  ogImageUrl: string;
}

export function getSiteConfig(): SiteConfig {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://lnorton89.github.io").replace(/\/+$/, "");
  const rawBase = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const base = rawBase ? (rawBase.startsWith("/") ? rawBase : `/${rawBase}`) : "";
  const rootUrl = `${origin}${base}/`;
  return {
    origin,
    base,
    rootUrl,
    canonicalPath: `${base}/`,
    sitemapUrl: `${origin}${base}/sitemap.xml`,
    ogImageUrl: `${origin}${base}/og-image.png`,
  };
}

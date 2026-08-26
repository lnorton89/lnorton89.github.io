import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lnorton89.github.io";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const url = basePath ? `${siteUrl}${basePath.startsWith("/") ? basePath : `/${basePath}`}/` : `${siteUrl}/`;
  return [{ url, lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
}

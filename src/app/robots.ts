import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const { sitemapUrl } = getSiteConfig();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: sitemapUrl,
  };
}

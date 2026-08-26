import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const { rootUrl } = getSiteConfig();
  return [{ url: rootUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
}

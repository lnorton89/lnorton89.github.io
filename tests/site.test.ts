import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSiteConfig } from "../src/lib/site";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.github.io";
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("getSiteConfig", () => {
  it("builds a root user-page URL set", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "";
    const cfg = getSiteConfig();
    expect(cfg.origin).toBe("https://example.github.io");
    expect(cfg.base).toBe("");
    expect(cfg.rootUrl).toBe("https://example.github.io/");
    expect(cfg.canonicalPath).toBe("/");
    expect(cfg.sitemapUrl).toBe("https://example.github.io/sitemap.xml");
    expect(cfg.ogImageUrl).toBe("https://example.github.io/og-image.png");
  });

  it("builds a project-page URL set with the base path", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/repository";
    const cfg = getSiteConfig();
    expect(cfg.rootUrl).toBe("https://example.github.io/repository/");
    expect(cfg.canonicalPath).toBe("/repository/");
    expect(cfg.sitemapUrl).toBe("https://example.github.io/repository/sitemap.xml");
    expect(cfg.ogImageUrl).toBe("https://example.github.io/repository/og-image.png");
  });

  it("normalizes a base path without a leading slash", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "repo";
    expect(getSiteConfig().base).toBe("/repo");
  });

  it("falls back to a default origin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_BASE_PATH = "";
    expect(getSiteConfig().rootUrl).toMatch(/^https:\/\/lnorton89\.github\.io\/$/);
  });
});

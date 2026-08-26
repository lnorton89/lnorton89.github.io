import { describe, it, expect } from "vitest";
import { computeLanguageMetrics } from "../src/lib/language-metrics";
import type { RepoSummary } from "../src/lib/types";

function repo(fullName: string, languages: Record<string, number>): RepoSummary {
  return {
    name: fullName.split("/")[1],
    fullName,
    description: null,
    url: `https://github.com/${fullName}`,
    homepage: null,
    language: null,
    stars: 0,
    forks: 0,
    openIssues: 0,
    pushedAt: "2026-01-01T00:00:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    topics: [],
    visibility: "public",
    languages,
  };
}

describe("computeLanguageMetrics", () => {
  it("computes raw bytes and project-normalized prevalence", () => {
    const repos = [
      repo("user/big-html", { HTML: 50_000_000, TypeScript: 10_000 }),
      repo("user/ts-app", { TypeScript: 900_000, CSS: 100_000 }),
    ];
    const { metrics, repoCount, totalBytes } = computeLanguageMetrics(repos);
    expect(repoCount).toBe(2);
    expect(totalBytes).toBe(51_010_000);

    const html = metrics.find((m) => m.name === "HTML");
    const ts = metrics.find((m) => m.name === "TypeScript");
    const css = metrics.find((m) => m.name === "CSS");

    // A single large repository contributes at most 1.0 prevalence total, so
    // it cannot dominate the prevalence ranking the way it dominates bytes.
    expect(html.bytes).toBe(50_000_000);
    expect(ts.bytes).toBe(910_000);
    expect(html.prevalence).toBeCloseTo(50_000_000 / 50_010_000, 6);
    expect(ts.prevalence).toBeCloseTo(10_000 / 50_010_000 + 900_000 / 1_000_000, 6);
    expect(css.prevalence).toBeCloseTo(0.1, 6);
  });

  it("ignores repositories without language data", () => {
    const bare = repo("user/bare", {});
    const result = computeLanguageMetrics([bare]);
    expect(result.repoCount).toBe(0);
    expect(result.metrics).toHaveLength(0);
  });
});

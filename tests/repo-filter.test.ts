import { describe, it, expect } from "vitest";
import { filterRepos, trackedFileCount } from "../src/lib/repo-filter";
import type { RepoSummary } from "../src/lib/types";

function repo(overrides: Partial<RepoSummary> & { name: string; fullName: string }): RepoSummary {
  return {
    description: null,
    url: `https://github.com/${overrides.fullName}`,
    homepage: null,
    language: null,
    stars: 0,
    forks: 0,
    openIssues: 0,
    pushedAt: "2026-01-01T00:00:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    topics: [],
    visibility: "public",
    ...overrides,
  };
}

const REPOS: RepoSummary[] = [
  repo({ name: "alpha", fullName: "user/alpha", stars: 10, topics: ["cli"], languages: { TypeScript: 100, JavaScript: 20 }, pushedAt: "2026-03-01T00:00:00Z" }),
  repo({ name: "beta", fullName: "user/beta", stars: 50, topics: ["web", "react"], languages: { TypeScript: 900 }, pushedAt: "2026-06-01T00:00:00Z" }),
  repo({ name: "gamma", fullName: "user/gamma", stars: 5, topics: ["cli", "go"], languages: { Go: 400 }, pushedAt: "2026-01-01T00:00:00Z" }),
];

describe("filterRepos", () => {
  const options = { search: "", language: null, topic: null, sortBy: "updated" as const };

  it("filters by language", () => {
    const result = filterRepos(REPOS, { ...options, language: "Go" });
    expect(result.map((r) => r.name)).toEqual(["gamma"]);
  });

  it("filters by topic", () => {
    const result = filterRepos(REPOS, { ...options, topic: "cli" });
    expect(result.map((r) => r.name).sort()).toEqual(["alpha", "gamma"]);
  });

  it("combines language and topic filters", () => {
    const result = filterRepos(REPOS, { ...options, topic: "cli", language: "TypeScript" });
    expect(result.map((r) => r.name)).toEqual(["alpha"]);
  });

  it("searches name, description, and topics", () => {
    const result = filterRepos(REPOS, { ...options, search: "reac" });
    expect(result.map((r) => r.name)).toEqual(["beta"]);
  });

  it("sorts by stars", () => {
    const result = filterRepos(REPOS, { ...options, sortBy: "stars" });
    expect(result.map((r) => r.name)).toEqual(["beta", "alpha", "gamma"]);
  });

  it("does not match a language when the repo has no language map", () => {
    const bare = repo({ name: "delta", fullName: "user/delta", languages: undefined });
    const result = filterRepos([bare], { ...options, language: "TypeScript" });
    expect(result).toHaveLength(0);
  });
});

describe("trackedFileCount", () => {
  it("returns the total of recognized language files", () => {
    expect(trackedFileCount(repo({ name: "a", fullName: "u/a", languageFiles: { TypeScript: 4, Go: 6 } }))).toBe(10);
  });

  it("returns null when there is no tree data instead of faking a zero", () => {
    expect(trackedFileCount(repo({ name: "a", fullName: "u/a", languageFiles: undefined }))).toBeNull();
    expect(trackedFileCount(repo({ name: "a", fullName: "u/a", languageFiles: {} }))).toBeNull();
  });

  it("returns null when the tree was truncated so a partial count is never authoritative", () => {
    expect(
      trackedFileCount(repo({ name: "a", fullName: "u/a", languageFiles: { TypeScript: 4 }, languageFilesComplete: false }))
    ).toBeNull();
  });

  it("never estimates from byte counts", () => {
    const result = trackedFileCount(repo({ name: "a", fullName: "u/a", languages: { TypeScript: 90000 }, languageFiles: undefined }));
    expect(result).toBeNull();
  });
});

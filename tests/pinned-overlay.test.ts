import { describe, it, expect } from "vitest";
import { overlayPinnedRepos } from "../src/lib/pinned-overlay";
import type { PinnedRepo, RepoSummary } from "../src/lib/types";

function pinned(overrides: Partial<PinnedRepo> = {}): PinnedRepo {
  return {
    name: "alpha",
    fullName: "user/alpha",
    description: "pinned description",
    url: "https://github.com/user/alpha",
    stargazerCount: 1,
    forkCount: 0,
    primaryLanguage: { name: "TypeScript", color: "#4f8cff" },
    ...overrides,
  };
}

function repo(overrides: Partial<RepoSummary> = {}): RepoSummary {
  return {
    name: "alpha",
    fullName: "user/alpha",
    description: "refreshed description",
    url: "https://github.com/user/alpha",
    homepage: null,
    language: "TypeScript",
    stars: 9,
    forks: 3,
    openIssues: 2,
    pushedAt: "2026-06-01T00:00:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    topics: ["cli", "fresh"],
    visibility: "public",
    ...overrides,
  };
}

describe("overlayPinnedRepos", () => {
  it("overlays refreshed metadata matched by full repository identity", () => {
    const result = overlayPinnedRepos([pinned()], [repo()]);
    expect(result).toHaveLength(1);
    expect(result[0].stargazerCount).toBe(9);
    expect(result[0].forkCount).toBe(3);
    expect(result[0].openIssues).toBe(2);
    expect(result[0].description).toBe("refreshed description");
    expect(result[0].topics).toEqual(["cli", "fresh"]);
    // Build-only pinned info is preserved.
    expect(result[0].primaryLanguage).toEqual({ name: "TypeScript", color: "#4f8cff" });
    expect(result[0].fullName).toBe("user/alpha");
  });

  it("keeps the build-time pinned record when there is no refreshed match", () => {
    const result = overlayPinnedRepos([pinned()], [repo({ fullName: "user/other" })]);
    expect(result[0].stargazerCount).toBe(1);
    expect(result[0].description).toBe("pinned description");
  });

  it("preserves pinned ordering and the pinned set exactly", () => {
    const pinnedList = [pinned({ name: "beta", fullName: "user/beta" }), pinned()];
    const result = overlayPinnedRepos(pinnedList, [repo()]);
    expect(result.map((r) => r.fullName)).toEqual(["user/beta", "user/alpha"]);
  });

  it("does not match by bare repo name when owners differ", () => {
    const result = overlayPinnedRepos([pinned({ name: "alpha", fullName: "someone-else/alpha" })], [repo()]);
    expect(result[0].stargazerCount).toBe(1);
  });

  it("returns null when there are no pinned repos", () => {
    expect(overlayPinnedRepos(null, [repo()])).toBeNull();
  });
});

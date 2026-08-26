import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mergeRepos, mergeSnapshot, type ClientRefresh } from "../src/lib/merge-snapshot";
import type { GithubSnapshot, RepoSummary, RefreshableRepo } from "../src/lib/types";

function baseRepo(overrides: Partial<RepoSummary> = {}): RepoSummary {
  return {
    name: "alpha",
    fullName: "user/alpha",
    description: "original description",
    url: "https://github.com/user/alpha",
    homepage: null,
    language: "TypeScript",
    stars: 1,
    forks: 0,
    openIssues: 0,
    pushedAt: "2026-01-01T00:00:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    topics: ["cli"],
    visibility: "public",
    languages: { TypeScript: 80000, JavaScript: 20000 },
    languageFiles: { TypeScript: 40, JavaScript: 12 },
    ...overrides,
  };
}

function baseSnapshot(): GithubSnapshot {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    refreshedAt: null,
    profile: {
      login: "user",
      name: "User",
      avatarUrl: "https://avatars.example/u.png",
      bio: null,
      company: null,
      location: null,
      blog: null,
      followers: 1,
      following: 1,
      publicRepos: 1,
      createdAt: "2025-01-01T00:00:00Z",
      htmlUrl: "https://github.com/user",
    },
    languageTotals: { TypeScript: 80000, JavaScript: 20000 },
    topRepos: [baseRepo()],
    pinnedRepos: null,
    feed: [],
    weeklyCommits: [],
    weeklyCommitsCoverage: { complete: true, eligibleRepos: 1, coveredRepos: 1, pendingRepos: 0, failedRepos: 0 },
    contributions: null,
    hasLiveContributionData: false,
  };
}

function freshRepo(overrides: Partial<RefreshableRepo> = {}): RefreshableRepo {
  return {
    name: "alpha",
    fullName: "user/alpha",
    description: "fresh description",
    url: "https://github.com/user/alpha",
    homepage: "https://alpha.example",
    language: "Rust",
    stars: 5,
    forks: 1,
    openIssues: 2,
    pushedAt: "2026-06-01T00:00:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    topics: ["cli", "fresh"],
    visibility: "public",
    ...overrides,
  };
}

describe("mergeRepos", () => {
  it("preserves build-time languages and languageFiles from a client refresh", () => {
    const merged = mergeRepos([baseRepo()], [freshRepo()]);
    expect(merged).toHaveLength(1);
    expect(merged[0].description).toBe("fresh description");
    expect(merged[0].stars).toBe(5);
    expect(merged[0].language).toBe("Rust");
    expect(merged[0].languages).toEqual({ TypeScript: 80000, JavaScript: 20000 });
    expect(merged[0].languageFiles).toEqual({ TypeScript: 40, JavaScript: 12 });
  });

  it("does not replace records missing from the fresh response (grid never shrinks)", () => {
    const merged = mergeRepos([baseRepo(), baseRepo({ name: "beta", fullName: "user/beta" })], [freshRepo()]);
    const names = merged.map((r) => r.fullName).sort();
    expect(names).toEqual(["user/alpha", "user/beta"]);
    const beta = merged.find((r) => r.fullName === "user/beta");
    expect(beta?.languages).toEqual({ TypeScript: 80000, JavaScript: 20000 });
    expect(beta?.stars).toBe(1);
  });

  it("adds brand-new repositories returned by the refresh", () => {
    const merged = mergeRepos([baseRepo()], [freshRepo(), freshRepo({ name: "gamma", fullName: "user/gamma", stars: 9 })]);
    const gamma = merged.find((r) => r.fullName === "user/gamma");
    expect(gamma?.stars).toBe(9);
    expect(gamma?.languages).toBeUndefined();
  });

  it("sorts merged results by most recently pushed", () => {
    const merged = mergeRepos(
      [baseRepo({ fullName: "user/old", pushedAt: "2025-01-01T00:00:00Z" })],
      [freshRepo({ fullName: "user/new", pushedAt: "2026-06-01T00:00:00Z" })]
    );
    expect(merged.map((r) => r.fullName)).toEqual(["user/new", "user/old"]);
  });
});

describe("mergeSnapshot", () => {
  it("refreshes only profile, repos, and feed; carries build datasets through", () => {
    const base = baseSnapshot();
    const refresh: ClientRefresh = {
      profile: { ...base.profile, followers: 9 },
      repos: [freshRepo()],
      feed: [{ id: "e1", type: "PushEvent", repo: "user/alpha", createdAt: "2026-06-01T00:00:00Z", summary: "pushed 1 commit" }],
    };
    const merged = mergeSnapshot(base, refresh, "2026-06-02T00:00:00.000Z");

    expect(merged.refreshedAt).toBe("2026-06-02T00:00:00.000Z");
    expect(merged.profile.followers).toBe(9);
    expect(merged.feed).toHaveLength(1);
    expect(merged.languageTotals).toEqual(base.languageTotals);
    expect(merged.weeklyCommits).toEqual(base.weeklyCommits);
    expect(merged.weeklyCommitsCoverage).toEqual(base.weeklyCommitsCoverage);
    expect(merged.contributions).toBeNull();
    expect(merged.topRepos[0].languages).toEqual({ TypeScript: 80000, JavaScript: 20000 });
  });

  it("does not mutate the base snapshot", () => {
    const base = baseSnapshot();
    const original = JSON.stringify(base);
    mergeSnapshot(
      base,
      { profile: base.profile, repos: [freshRepo()], feed: [] },
      "2026-06-02T00:00:00.000Z"
    );
    expect(JSON.stringify(base)).toBe(original);
    expect(base.refreshedAt).toBeNull();
  });
});

describe("fetchLiveSnapshot failure behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects with a GithubApiError on a rate-limited request instead of producing a snapshot", async () => {
    const { fetchLiveSnapshot } = await import("../src/lib/fetch-live");
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response("rate limited", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "9999999999" } }));

    const base = baseSnapshot();
    await expect(fetchLiveSnapshot("user", base)).rejects.toMatchObject({
      name: "GithubApiError",
      status: 403,
      rateLimitRemaining: "0",
    });
    // A failed refresh must leave the existing snapshot untouched.
    expect(base.refreshedAt).toBeNull();
  });
});

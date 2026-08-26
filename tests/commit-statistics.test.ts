import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildWeeklyScaffold,
  findContributorWeeks,
  mergeContributorWeeks,
  finalizeWeeklyCommits,
} from "../scripts/commit-statistics.mjs";

const NOW = new Date("2026-08-25T12:00:00Z");

function contributorEntry(login, weeks = []) {
  return {
    author: { login },
    total: weeks.reduce((sum, w) => sum + (w.c || 0), 0),
    weeks,
  };
}

describe("buildWeeklyScaffold", () => {
  it("produces 52 weeks oldest-first with the current week last", () => {
    const weeks = buildWeeklyScaffold(NOW);
    expect(weeks).toHaveLength(52);
    expect(weeks[0].weekStart).toBe("2025-08-31");
    expect(weeks[51].weekStart).toBe("2026-08-23");
    expect(weeks.every((w) => w.commits === 0)).toBe(true);
  });
});

describe("findContributorWeeks", () => {
  it("selects the matching contributor case-insensitively", () => {
    const contributors = [
      contributorEntry("Other", [{ w: 1, c: 9 }]),
      contributorEntry("LNORTON89", [{ w: 2, c: 4 }]),
    ];
    const { found, weeks } = findContributorWeeks(contributors, "lnorton89");
    expect(found).toBe(true);
    expect(weeks).toEqual([{ w: 2, c: 4 }]);
  });

  it("returns found:false when the user is not listed (measured zero, not missing)", () => {
    const contributors = [contributorEntry("Other", [{ w: 1, c: 9 }])];
    const { found, weeks } = findContributorWeeks(contributors, "lnorton89");
    expect(found).toBe(false);
    expect(weeks).toEqual([]);
  });

  it("ignores entries with null authors (unlinked commits)", () => {
    const contributors = [{ author: null, total: 5, weeks: [{ w: 1, c: 5 }] }];
    expect(findContributorWeeks(contributors, "lnorton89").found).toBe(false);
  });

  it("handles a non-array payload", () => {
    expect(findContributorWeeks(undefined, "lnorton89").found).toBe(false);
    expect(findContributorWeeks(null, "lnorton89").found).toBe(false);
  });
});

describe("mergeContributorWeeks", () => {
  it("sums weekly c counts into the matching scaffold weeks", () => {
    const scaffold = buildWeeklyScaffold(NOW);
    const contributorWeeks = [
      { w: new Date("2026-08-23T00:00:00Z").getTime() / 1000, c: 3 },
      { w: new Date("2026-08-16T00:00:00Z").getTime() / 1000, c: 5 },
      { w: 0, c: 10 }, // out of range week start -> ignored
    ];
    const merged = mergeContributorWeeks(scaffold, contributorWeeks);
    expect(merged[51].commits).toBe(3);
    expect(merged[50].commits).toBe(5);
    expect(merged[0].commits).toBe(0);
  });
});

describe("finalizeWeeklyCommits", () => {
  it("returns complete data when every repository is covered", () => {
    const scaffold = buildWeeklyScaffold(NOW);
    const results = [
      { status: "covered", contributorWeeks: [{ w: new Date("2026-08-23T00:00:00Z").getTime() / 1000, c: 2 }] },
      { status: "covered", contributorWeeks: [] }, // user not listed -> zero
    ];
    const { weeklyCommits, weeklyCommitsCoverage } = finalizeWeeklyCommits(scaffold, results);
    expect(weeklyCommitsCoverage.complete).toBe(true);
    expect(weeklyCommitsCoverage.coveredRepos).toBe(2);
    expect(weeklyCommits[51].commits).toBe(2);
    expect(weeklyCommits[50].commits).toBe(0);
    expect(weeklyCommits.some((w) => w.commits === null)).toBe(false);
  });

  it("marks the dataset incomplete (all weeks null) when a repo is pending or failed", () => {
    const scaffold = buildWeeklyScaffold(NOW);
    const results = [
      { status: "covered", contributorWeeks: [] },
      { status: "pending" },
      { status: "failed" },
    ];
    const { weeklyCommits, weeklyCommitsCoverage } = finalizeWeeklyCommits(scaffold, results);
    expect(weeklyCommitsCoverage).toEqual({
      complete: false,
      eligibleRepos: 3,
      coveredRepos: 1,
      pendingRepos: 1,
      failedRepos: 1,
    });
    expect(weeklyCommits.every((w) => w.commits === null)).toBe(true);
  });
});

describe("contributorCommitActivity HTTP handling", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats a 204 as measured zero (empty contributors)", async () => {
    const { contributorCommitActivity } = await import("../scripts/commit-statistics.mjs");
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await contributorCommitActivity("user", "repo");
    expect(result).toEqual([]);
  });

  it("returns null when 202 statistics-generation retries are exhausted", async () => {
    const { contributorCommitActivity } = await import("../scripts/commit-statistics.mjs");
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const result = await contributorCommitActivity("user", "repo");
    expect(result).toBeNull();
  });

  it("returns the contributors array on a 200 response", async () => {
    const { contributorCommitActivity } = await import("../scripts/commit-statistics.mjs");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([contributorEntry("user", [{ w: 1, c: 2 }])]), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const result = await contributorCommitActivity("user", "repo");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].author.login).toBe("user");
  });

  it("throws on other non-OK statuses", async () => {
    const { contributorCommitActivity } = await import("../scripts/commit-statistics.mjs");
    vi.mocked(fetch).mockResolvedValueOnce(new Response("boom", { status: 500 }));
    await expect(contributorCommitActivity("user", "repo")).rejects.toThrow(/500/);
  });
});

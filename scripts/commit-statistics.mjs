// Pure helpers for per-contributor commit statistics. The build script
// (fetch-github-data.mjs) fetches /repos/{owner}/{repo}/stats/contributors and
// feeds the results through these functions; the tests exercise the same logic
// without any network access.

export const WEEKS = 52;

// Builds the 52-week scaffold anchored to the current week, oldest first.
export function buildWeeklyScaffold(now = new Date()) {
  const weeks = [];
  for (let i = 51; i >= 0; i -= 1) {
    const weekStart = new Date(now);
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() - i * 7);
    weeks.push({ weekStart: weekStart.toISOString().slice(0, 10), commits: 0 });
  }
  return weeks;
}

// GET /repos/{owner}/{repo}/stats/contributors. Returns the contributors array
// on 200, [] for a 204 (measured zero), or null when the bounded 202 retries
// are exhausted (statistics still generating).
export async function contributorCommitActivity(
  username,
  repoName,
  { rest = "https://api.github.com", headers = {}, retryAttempts = 3, waitMs = 1000 } = {}
) {
  const url = `${rest}/repos/${username}/${repoName}/stats/contributors`;
  for (let attempt = 0; attempt < retryAttempts; attempt += 1) {
    const res = await fetch(url, { headers });
    if (res.status === 202) {
      // GitHub is still generating statistics for this repository. Wait briefly
      // and retry a bounded number of times instead of treating it as empty.
      if (attempt < retryAttempts - 1) await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }
    if (res.status === 204) {
      // No contributor activity in the window: measured zero, not missing.
      return [];
    }
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${await res.text()}`);
    return res.json();
  }
  // Exhausted the bounded 202 retries: statistics are still generating.
  return null;
}

// Finds the weekly commit counts attributable to `login` within a
// `/stats/contributors` response. GitHub stats endpoints return 0-values for
// addition/deletion in very large repos, but `weeks[].c` (commits) is real.
// A successful response that does not list the user means the user authored
// no commits there — measured zero, not missing data.
export function findContributorWeeks(contributors, login) {
  if (!Array.isArray(contributors)) return { found: false, weeks: [] };
  const target = (login || "").toLowerCase();
  const entry = contributors.find(
    (c) => c && c.author && c.author.login && c.author.login.toLowerCase() === target
  );
  if (!entry) return { found: false, weeks: [] };
  return { found: true, weeks: Array.isArray(entry.weeks) ? entry.weeks : [] };
}

// Sums a contributor's weekly `c` counts into a scaffold, returning a new array.
export function mergeContributorWeeks(scaffold, contributorWeeks) {
  const out = scaffold.map((week) => ({ ...week }));
  for (const week of contributorWeeks || []) {
    if (!week || typeof week.w !== "number") continue;
    const weekStart = new Date(week.w * 1000).toISOString().slice(0, 10);
    const target = out.find((entry) => entry.weekStart === weekStart);
    if (target) target.commits += week.c || 0;
  }
  return out;
}

// Aggregates per-repository outcomes into the final weekly dataset and
// coverage metadata. A repository is only "covered" when its statistics
// endpoint returned data (200/204). If any repository is pending (202 retries
// exhausted) or failed, the dataset is marked incomplete: every week is set to
// null rather than presenting an authoritative-looking undercount.
export function finalizeWeeklyCommits(scaffold, results) {
  let coveredRepos = 0;
  let pendingRepos = 0;
  let failedRepos = 0;
  let weeks = scaffold.map((week) => ({ ...week }));

  for (const result of results) {
    if (result.status === "covered") {
      coveredRepos += 1;
      weeks = mergeContributorWeeks(weeks, result.contributorWeeks ?? []);
    } else if (result.status === "pending") {
      pendingRepos += 1;
    } else {
      failedRepos += 1;
    }
  }

  const complete = coveredRepos === results.length;
  return {
    weeklyCommits: complete ? weeks : weeks.map((week) => ({ ...week, commits: null })),
    weeklyCommitsCoverage: {
      complete,
      eligibleRepos: results.length,
      coveredRepos,
      pendingRepos,
      failedRepos,
    },
  };
}

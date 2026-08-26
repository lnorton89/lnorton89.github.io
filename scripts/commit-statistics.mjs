// Pure helpers for per-contributor commit statistics. The build script
// (fetch-github-data.mjs) fetches /repos/{owner}/{repo}/stats/contributors and
// feeds the results through these functions; tests exercise the same logic.

export const WEEKS = 52;

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
// on 200, [] for 204 (measured zero), or null when GitHub is still generating
// statistics after the bounded retry budget.
export async function contributorCommitActivity(
  username,
  repoName,
  { rest = "https://api.github.com", headers = {}, retryAttempts = 3, waitMs = 1000 } = {}
) {
  const url = `${rest}/repos/${username}/${repoName}/stats/contributors`;
  for (let attempt = 0; attempt < retryAttempts; attempt += 1) {
    const res = await fetch(url, { headers });
    if (res.status === 202) {
      if (attempt < retryAttempts - 1) await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${await res.text()}`);
    return res.json();
  }
  return null;
}

export function findContributorWeeks(contributors, login) {
  if (!Array.isArray(contributors)) return { found: false, weeks: [] };
  const target = (login || "").toLowerCase();
  const entry = contributors.find(
    (c) => c && c.author && c.author.login && c.author.login.toLowerCase() === target
  );
  if (!entry) return { found: false, weeks: [] };
  return { found: true, weeks: Array.isArray(entry.weeks) ? entry.weeks : [] };
}

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

// Preserve all known measurements even when one repository is pending/failed.
// Coverage metadata qualifies the aggregate so partial data is never mistaken
// for a complete total, while 41/42 good repositories no longer disappear.
export function finalizeWeeklyCommits(scaffold, results) {
  let coveredRepos = 0;
  let pendingRepos = 0;
  let failedRepos = 0;
  let weeks = scaffold.map((week) => ({ ...week }));
  const pendingRepoNames = [];
  const failedRepoNames = [];

  for (const result of results) {
    if (result.status === "covered") {
      coveredRepos += 1;
      weeks = mergeContributorWeeks(weeks, result.contributorWeeks ?? []);
    } else if (result.status === "pending") {
      pendingRepos += 1;
      if (result.repoName) pendingRepoNames.push(result.repoName);
    } else {
      failedRepos += 1;
      if (result.repoName) failedRepoNames.push(result.repoName);
    }
  }

  const complete = coveredRepos === results.length;
  return {
    weeklyCommits: weeks,
    weeklyCommitsCoverage: {
      complete,
      eligibleRepos: results.length,
      coveredRepos,
      pendingRepos,
      failedRepos,
      pendingRepoNames,
      failedRepoNames,
    },
  };
}

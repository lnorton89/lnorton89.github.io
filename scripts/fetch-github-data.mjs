// Build-time data fetch. Runs before `next build` (see package.json "prebuild").
// Pulls a live snapshot of a GitHub user's public activity and writes it to
// public/data/github.json so the statically exported site has no server to talk to.
//
// Auth: pass a token via GITHUB_TOKEN (Actions provides this automatically) or
// GH_PAT for a personal access token with higher rate limits / contribution data.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import "dotenv/config"; // loads .env.local for local development; no-op in CI

const USERNAME = process.env.GH_USERNAME;

function getGithubToken() {
  if (process.env.GH_PAT || process.env.GITHUB_TOKEN) {
    return process.env.GH_PAT || process.env.GITHUB_TOKEN;
  }

  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || undefined;
  } catch {
    return undefined;
  }
}

const TOKEN = getGithubToken();

if (!USERNAME) {
  console.error(
    "Missing GH_USERNAME. Set it in .env.local (dev) or as a repo variable (Actions)."
  );
  process.exit(1);
}

const REST = "https://api.github.com";
const GRAPHQL = "https://api.github.com/graphql";

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": `${USERNAME}-github-showcase`,
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

const repoLanguages = {};

async function rest(pathname, params = {}) {
  const url = new URL(REST + pathname);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function graphql(query, variables) {
  if (!TOKEN) return null; // contribution calendar needs an authenticated request
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    console.warn(`GraphQL request failed: ${res.status} ${await res.text()}`);
    return null;
  }
  const json = await res.json();
  if (json.errors) {
    console.warn("GraphQL errors:", JSON.stringify(json.errors));
    return null;
  }
  return json.data;
}

async function main() {
  console.log(`Fetching GitHub snapshot for ${USERNAME}...`);

  const profile = await rest(`/users/${USERNAME}`);

  const repos = await rest(`/users/${USERNAME}/repos`, {
    per_page: 100,
    sort: "pushed",
    direction: "desc",
    type: "owner",
  });

  const nonForkRepos = repos.filter((r) => !r.fork && !r.archived);

  // Language bytes across the most recently active repos (capped to limit API calls)
  const languageTargets = nonForkRepos.slice(0, 20);
  const languageTotals = {};
  for (const repo of languageTargets) {
    try {
      const langs = await rest(`/repos/${USERNAME}/${repo.name}/languages`);
      repoLanguages[repo.full_name] = langs;
      for (const [lang, bytes] of Object.entries(langs)) {
        languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
      }
    } catch (err) {
      console.warn(`languages fetch failed for ${repo.name}:`, err.message);
    }
  }

  const topRepos = nonForkRepos
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      url: r.html_url,
      homepage: r.homepage,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      openIssues: r.open_issues_count,
      pushedAt: r.pushed_at,
      createdAt: r.created_at,
      topics: r.topics || [],
      visibility: r.visibility,
      languages: repoLanguages[r.full_name] || (r.language ? { [r.language]: 1 } : {}),
    }));

  const events = await rest(`/users/${USERNAME}/events/public`, { per_page: 50 });
  const feed = (
    await Promise.all(
      events
    .filter((e) =>
      ["PushEvent", "PullRequestEvent", "IssuesEvent", "CreateEvent", "ReleaseEvent", "WatchEvent"].includes(
        e.type
      )
    )
    .slice(0, 30)
        .map((e) => summarizeEvent(e))
    )
  );

  // Weekly commit counts for the last 52 weeks, derived from PushEvents (build-time
  // approximation — the events API only covers ~90 days; older weeks are backfilled
  // with 0 and the chart is framed as "recent" activity, not a full year).
  const weeklyCommits = await buildWeeklyCommits(USERNAME, nonForkRepos, events);

  const contribData = await graphql(
    `
      query ($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  weekday
                }
              }
            }
            totalCommitContributions
            totalPullRequestContributions
            totalIssueContributions
            totalRepositoryContributions
          }
          pinnedItems(first: 6, types: [REPOSITORY]) {
            nodes {
              ... on Repository {
                name
                description
                url
                stargazerCount
                forkCount
                primaryLanguage {
                  name
                  color
                }
              }
            }
          }
        }
      }
    `,
    { login: USERNAME }
  );

  const snapshot = {
    generatedAt: new Date().toISOString(),
    profile: {
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      company: profile.company,
      location: profile.location,
      blog: profile.blog,
      followers: profile.followers,
      following: profile.following,
      publicRepos: profile.public_repos,
      createdAt: profile.created_at,
      htmlUrl: profile.html_url,
    },
    languageTotals,
    topRepos,
    pinnedRepos: contribData?.user?.pinnedItems?.nodes ?? null,
    feed,
    weeklyCommits,
    contributions: contribData?.user?.contributionsCollection ?? null,
    hasLiveContributionData: Boolean(contribData),
  };

  await mkdir(path.join(process.cwd(), "public", "data"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "public", "data", "github.json"),
    JSON.stringify(snapshot, null, 2)
  );

  console.log(
    `Wrote public/data/github.json — ${topRepos.length} repos, ${feed.length} feed items, ${
      Object.keys(languageTotals).length
    } languages.`
  );
}

async function summarizeEvent(e) {
  const base = {
    id: e.id,
    type: e.type,
    repo: e.repo?.name,
    createdAt: e.created_at,
  };
  switch (e.type) {
    case "PushEvent": {
      const commitSha = e.payload.head;
      let commitMessage = e.payload.commits?.[e.payload.commits.length - 1]?.message?.split("\n")[0];
      if (!commitMessage && commitSha && e.repo?.name) {
        try {
          const commit = await rest(`/repos/${e.repo.name}/commits/${commitSha}`);
          commitMessage = commit.commit?.message?.split("\n")[0];
        } catch {
          commitMessage = `commit ${commitSha.slice(0, 7)}`;
        }
      }
      return {
        ...base,
        summary: `pushed ${Math.max(1, e.payload.commits?.length ?? 0)} commit${
          Math.max(1, e.payload.commits?.length ?? 0) === 1 ? "" : "s"
        }`,
        detail: commitMessage || "commit details unavailable",
        url: commitSha && e.repo?.name ? `https://github.com/${e.repo.name}/commit/${commitSha}` : undefined,
        commits: (e.payload.commits?.length ? e.payload.commits : commitSha ? [{ sha: commitSha, message: commitMessage }] : []).map((commit) => ({
          sha: commit.sha,
          message: commit.message?.split("\n")[0] || "commit message unavailable",
          url: e.repo?.name && commit.sha
            ? `https://github.com/${e.repo.name}/commit/${commit.sha}`
            : undefined,
        })),
      };
    }
    case "PullRequestEvent": {
      let title = e.payload.pull_request?.title;
      if (!title && e.payload.pull_request?.number && e.repo?.name) {
        try {
          const pull = await rest(`/repos/${e.repo.name}/pulls/${e.payload.pull_request.number}`);
          title = pull.title;
        } catch {
          title = `pull request #${e.payload.pull_request.number}`;
        }
      }
      return {
        ...base,
        summary: `${e.payload.action} a pull request`,
        detail: title || "pull request details unavailable",
        url: e.payload.pull_request?.html_url
          ?? (e.payload.pull_request?.number && e.repo?.name
            ? `https://github.com/${e.repo.name}/pull/${e.payload.pull_request.number}`
            : undefined),
      };
    }
    case "IssuesEvent":
      return {
        ...base,
        summary: `${e.payload.action} an issue`,
        detail: e.payload.issue?.title,
        url: e.payload.issue?.html_url,
      };
    case "CreateEvent":
      return {
        ...base,
        summary: `created ${e.payload.ref_type}`,
        detail: e.payload.ref || e.repo?.name,
      };
    case "ReleaseEvent":
      return {
        ...base,
        summary: `${e.payload.action} a release`,
        detail: e.payload.release?.tag_name,
        url: e.payload.release?.html_url,
      };
    case "WatchEvent":
      return { ...base, summary: "starred", detail: e.repo?.name };
    default:
      return { ...base, summary: e.type, detail: "" };
  }
}

async function buildWeeklyCommits(username, repos, events) {
  const now = new Date();
  const weeks = [];
  for (let i = 51; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() - i * 7);
    weeks.push({ weekStart: weekStart.toISOString().slice(0, 10), commits: 0 });
  }

  let statsSucceeded = false;
  for (const repo of repos.slice(0, 20)) {
    try {
      const stats = await rest(`/repos/${username}/${repo.name}/stats/commit_activity`);
      if (!Array.isArray(stats)) continue;
      statsSucceeded = true;
      for (const week of stats) {
        const weekStart = new Date(week.week * 1000).toISOString().slice(0, 10);
        const target = weeks.find((entry) => entry.weekStart === weekStart);
        if (target) target.commits += week.total || 0;
      }
    } catch (err) {
      console.warn(`commit activity fetch failed for ${repo.name}:`, err.message);
    }
  }

  if (statsSucceeded) return weeks;

  // The events API is an intentionally rough fallback when commit statistics
  // are still being computed or unavailable for the repository.
  for (const event of events.filter((entry) => entry.type === "PushEvent")) {
    const created = new Date(event.created_at);
    created.setUTCHours(0, 0, 0, 0);
    created.setUTCDate(created.getUTCDate() - created.getUTCDay());
    const target = weeks.find((entry) => entry.weekStart === created.toISOString().slice(0, 10));
    if (target) target.commits += Math.max(1, event.payload.commits?.length ?? 0);
  }
  return weeks;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

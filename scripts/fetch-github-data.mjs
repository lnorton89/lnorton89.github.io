// Build-time data fetch. Runs before `next build` (see package.json "prebuild").
// Pulls a live snapshot of a GitHub user's public activity and writes it to
// public/data/github.json so the statically exported site has no server to talk to.
//
// Auth: pass a token via GITHUB_TOKEN (Actions provides this automatically) or
// GH_PAT for a personal access token with higher rate limits / contribution data.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import "dotenv/config"; // loads .env.local for local development; no-op in CI



const USERNAME = process.env.GH_USERNAME;
const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;

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
      for (const [lang, bytes] of Object.entries(langs)) {
        languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
      }
    } catch (err) {
      console.warn(`languages fetch failed for ${repo.name}:`, err.message);
    }
  }

  const topRepos = nonForkRepos
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 6)
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
    }));

  const events = await rest(`/users/${USERNAME}/events/public`, { per_page: 50 });
  const feed = events
    .filter((e) =>
      ["PushEvent", "PullRequestEvent", "IssuesEvent", "CreateEvent", "ReleaseEvent", "WatchEvent"].includes(
        e.type
      )
    )
    .slice(0, 30)
    .map((e) => summarizeEvent(e));

  // Weekly commit counts for the last 52 weeks, derived from PushEvents (build-time
  // approximation — the events API only covers ~90 days; older weeks are backfilled
  // with 0 and the chart is framed as "recent" activity, not a full year).
  const weeklyCommits = buildWeeklyCommits(events);

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

function summarizeEvent(e) {
  const base = {
    id: e.id,
    type: e.type,
    repo: e.repo?.name,
    createdAt: e.created_at,
  };
  switch (e.type) {
    case "PushEvent":
      return {
        ...base,
        summary: `pushed ${Math.max(1, e.payload.commits?.length ?? 0)} commit${
          Math.max(1, e.payload.commits?.length ?? 0) === 1 ? "" : "s"
        }`,
        detail: e.payload.commits?.[e.payload.commits.length - 1]?.message?.split("\n")[0],
      };
    case "PullRequestEvent":
      return {
        ...base,
        summary: `${e.payload.action} a pull request`,
        detail: e.payload.pull_request?.title,
      };
    case "IssuesEvent":
      return {
        ...base,
        summary: `${e.payload.action} an issue`,
        detail: e.payload.issue?.title,
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
      };
    case "WatchEvent":
      return { ...base, summary: "starred", detail: e.repo?.name };
    default:
      return { ...base, summary: e.type, detail: "" };
  }
}

function buildWeeklyCommits(events) {
  const now = new Date();
  const weeks = [];
  for (let i = 51; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7);
    weeks.push({ weekStart: weekStart.toISOString().slice(0, 10), commits: 0 });
  }
  const pushEvents = events.filter((e) => e.type === "PushEvent");
  for (const e of pushEvents) {
    const created = new Date(e.created_at);
    const diffWeeks = Math.floor((now - created) / (7 * 24 * 60 * 60 * 1000));
    const idx = 51 - diffWeeks;
    if (idx >= 0 && idx < weeks.length) {
      // Public events may omit the commits array; count the push itself rather
      // than displaying a misleading all-zero velocity chart.
      weeks[idx].commits += Math.max(1, e.payload.commits?.length ?? 0);
    }
  }
  return weeks;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

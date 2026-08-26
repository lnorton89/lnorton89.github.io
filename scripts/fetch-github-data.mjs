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
import { buildWeeklyScaffold, contributorCommitActivity, findContributorWeeks, finalizeWeeklyCommits } from "./commit-statistics.mjs";

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
  ...(TOKEN ? { Authorization: ["Bearer", TOKEN].join(" ") } : {}),
};

const repoLanguages = {};
const repoLanguageFiles = {};
const repoLanguageFilesComplete = {};

function languageFromPath(filePath) {
  const name = filePath.split("/").pop().toLowerCase();
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const extensions = {
    ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
    ".go": "Go", ".rs": "Rust", ".py": "Python", ".html": "HTML", ".htm": "HTML",
    ".css": "CSS", ".scss": "CSS", ".cpp": "C++", ".cc": "C++", ".cxx": "C++",
    ".cs": "C#", ".c": "C", ".ps1": "PowerShell", ".psm1": "PowerShell",
    ".sh": "Shell", ".bash": "Shell", ".cmake": "CMake", ".nix": "Nix",
    ".vb": "VBScript", ".vbs": "VBScript", ".md": "Markdown",
  };
  if (extensions[extension]) return extensions[extension];
  if (name === "dockerfile") return "Dockerfile";
  if (name === "makefile") return "Makefile";
  return null;
}

// Counts recognized files from a repository's recursive tree. An empty
// repository (409 "Git Repository is empty") is a quiet, expected state — the
// file data is complete and empty rather than a noisy failure. A truncated
// tree is recorded as incomplete so the UI never presents a partial count as
// authoritative. `files` are keyed by language; `complete` reflects whether
// the whole tree was walked.
async function fetchRepoFiles(repo) {
  const empty = { files: {}, complete: true };
  if (!repo.default_branch || repo.size === 0) return empty;
  try {
    const tree = await rest(`/repos/${USERNAME}/${repo.name}/git/trees/${repo.default_branch}?recursive=1`);
    const files = {};
    for (const entry of tree.tree ?? []) {
      if (entry.type !== "blob") continue;
      const language = languageFromPath(entry.path);
      if (language) files[language] = (files[language] || 0) + 1;
    }
    return { files, complete: !tree.truncated };
  } catch (err) {
    const body = String(err.message || "");
    if (body.includes("409") && /empty/i.test(body)) return empty;
    return { files: {}, complete: false };
  }
}

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

  const repos = [];
  for (let page = 1; ; page += 1) {
    const batch = await rest(`/users/${USERNAME}/repos`, {
      per_page: 100,
      page,
      sort: "pushed",
      direction: "desc",
      type: "owner",
    });
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  const nonForkRepos = repos.filter((r) => !r.fork && !r.archived);

  // Language bytes across every non-fork, non-archived repository.
  const languageTargets = nonForkRepos;
  const languageTotals = {};
  for (const repo of languageTargets) {
    try {
      const langs = await rest(`/repos/${USERNAME}/${repo.name}/languages`);
      repoLanguages[repo.full_name] = langs;
      const { files, complete } = await fetchRepoFiles(repo);
      repoLanguageFiles[repo.full_name] = files;
      repoLanguageFilesComplete[repo.full_name] = complete;
      for (const [lang, bytes] of Object.entries(langs)) {
        languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
      }
    } catch (err) {
      console.warn(`languages fetch failed for ${repo.name}:`, err.message);
      repoLanguageFilesComplete[repo.full_name] = false;
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
      languageFiles: repoLanguageFiles[r.full_name] || {},
      languageFilesComplete: repoLanguageFilesComplete[r.full_name] ?? true,
    }));

  const events = await rest(`/users/${USERNAME}/events/public`, { per_page: 50 });
  const feed = (
    await Promise.all(
      events
    .filter((e) =>
      ["PushEvent", "PullRequestEvent", "IssuesEvent", "IssueCommentEvent", "CreateEvent", "ReleaseEvent", "WatchEvent"].includes(
        e.type
      )
    )
    .slice(0, 30)
        .map((e) => summarizeEvent(e))
    )
  );

  // Weekly commit counts for the last 52 weeks attributed specifically to
  // USERNAME, derived from per-repository contributor statistics
  // (/stats/contributors). The Events API is limited to 300 events (about 30
  // days) and is never used for historical coverage. If any eligible
  // repository cannot be measured (statistics not yet generated after a bounded
  // retry, or a fetch failure), the whole dataset is marked incomplete rather
  // than presenting an authoritative-looking undercount.
  const { weeklyCommits, weeklyCommitsCoverage } = await buildWeeklyCommits(USERNAME, nonForkRepos);
  const commitCoverage = {
    complete: Boolean(weeklyCommitsCoverage?.complete),
    eligibleRepos: Number(weeklyCommitsCoverage?.eligibleRepos) || 0,
    coveredRepos: Number(weeklyCommitsCoverage?.coveredRepos) || 0,
    pendingRepos: Number(weeklyCommitsCoverage?.pendingRepos) || 0,
    failedRepos: Number(weeklyCommitsCoverage?.failedRepos) || 0,
  };

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
                nameWithOwner
                description
                url
                stargazerCount
                forkCount
                homepageUrl
                visibility
                createdAt
                issues {
                  totalCount
                }
                primaryLanguage {
                  name
                  color
                }
                repositoryTopics(first: 8) {
                  nodes {
                    topic {
                      name
                    }
                  }
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
    refreshedAt: null,
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
    pinnedRepos: contribData?.user?.pinnedItems?.nodes?.map((repo) => ({
      name: repo.name,
      fullName: repo.nameWithOwner,
      description: repo.description,
      url: repo.url,
      stargazerCount: repo.stargazerCount,
      forkCount: repo.forkCount,
      primaryLanguage: repo.primaryLanguage,
      homepage: repo.homepageUrl,
      visibility: repo.visibility?.toLowerCase(),
      openIssues: repo.issues?.totalCount ?? 0,
      createdAt: repo.createdAt,
      topics: repo.repositoryTopics?.nodes?.map(({ topic }) => topic.name) ?? [],
    })) ?? null,
    feed,
    weeklyCommits,
    weeklyCommitsCoverage: commitCoverage,
    contributions: contribData?.user?.contributionsCollection ?? null,
    hasLiveContributionData: Boolean(contribData),
    scope: {
      totalPublicRepos: profile.public_repos,
      trackedRepos: nonForkRepos.length,
      excludedForks: repos.filter((r) => r.fork).length,
      excludedArchived: repos.filter((r) => !r.fork && r.archived).length,
    },
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
    case "IssueCommentEvent":
      return {
        ...base,
        summary: "commented on an issue",
        detail: e.payload.issue?.title || "issue comment",
        url: e.payload.comment?.html_url ?? e.payload.issue?.html_url,
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

// Collects weekly commit counts attributed to `username` across all eligible
// repositories using the per-contributor statistics endpoint. Only commits the
// account authored are counted; the endpoint is never used to present
// repository-wide activity as personal commit velocity.
async function buildWeeklyCommits(username, repos) {
  const scaffold = buildWeeklyScaffold();
  const results = [];
  for (const repo of repos) {
    try {
      const contributors = await contributorCommitActivity(username, repo.name, { rest: REST, headers });
      if (contributors === null) {
        results.push({ status: "pending" });
        continue;
      }
      const { found, weeks } = findContributorWeeks(contributors, username);
      results.push({ status: "covered", contributorWeeks: found ? weeks : [] });
    } catch (err) {
      results.push({ status: "failed" });
      console.warn(`contributor commit activity fetch failed for ${repo.name}:`, err.message);
    }
  }
  return finalizeWeeklyCommits(scaffold, results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

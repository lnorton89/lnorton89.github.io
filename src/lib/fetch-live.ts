import type { GithubSnapshot, RepoSummary, FeedItem } from "@/lib/types";

const REST = "https://api.github.com";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${REST}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} failed: ${res.status}`);
  return res.json();
}

// Refreshes the parts of the snapshot that unauthenticated REST calls can see.
// Keep this to three requests per refresh: browsers share GitHub's 60 req/hr
// anonymous limit, so per-repository language requests are not safe to poll.
export async function fetchLiveSnapshot(
  username: string,
  base: GithubSnapshot
): Promise<GithubSnapshot> {
  type RestRepo = {
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    pushed_at: string;
    created_at: string;
    topics: string[];
    visibility: string;
    fork: boolean;
    archived: boolean;
  };

  type RestProfile = {
    login: string;
    name: string | null;
    avatar_url: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    blog: string | null;
    followers: number;
    following: number;
    public_repos: number;
    created_at: string;
    html_url: string;
  };

  type RestEvent = {
    id: string;
    type: string;
    repo?: { name: string };
    created_at: string;
    payload: Record<string, unknown>;
  };

  const [profile, repos, events] = await Promise.all([
    get<RestProfile>(`/users/${username}`),
    get<RestRepo[]>(`/users/${username}/repos?per_page=100&sort=pushed&direction=desc`),
    get<RestEvent[]>(`/users/${username}/events/public?per_page=30`),
  ]);

  const baseRepos = new Map(base.topRepos.map((repo) => [repo.fullName, repo]));

  const topRepos: RepoSummary[] = repos
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
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
      languages: baseRepos.get(r.full_name)?.languages ?? (r.language ? { [r.language]: 1 } : {}),
      languageFiles: baseRepos.get(r.full_name)?.languageFiles,
    }));

  const feed: FeedItem[] = await Promise.all(events.slice(0, 30).map(async (e) => ({
    id: e.id,
    type: e.type,
    repo: e.repo?.name ?? "",
    createdAt: e.created_at,
    summary: summarize(e),
    detail: await detail(e),
    url: eventUrl(e),
    commits: e.type === "PushEvent"
      ? ((e.payload.commits as Array<{ sha?: string; message?: string }> | undefined) ?? [])
          .filter((commit) => commit.sha)
          .map((commit) => ({
            sha: commit.sha as string,
            message: commit.message?.split("\n")[0] ?? "commit message unavailable",
            url: e.repo?.name ? `https://github.com/${e.repo.name}/commit/${commit.sha}` : undefined,
          }))
      : undefined,
  })));

  const weeklyCommits = buildWeeklyCommits(events);

  return {
    ...base,
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
    languageTotals: base.languageTotals,
    topRepos,
    feed,
    weeklyCommits,
  };
}

function summarize(e: { type: string; payload: Record<string, unknown> }): string {
  switch (e.type) {
    case "PushEvent": {
      const commits = e.payload.commits as unknown[] | undefined;
      const count = Math.max(1, commits?.length ?? 0);
      return `pushed ${count} commit${count === 1 ? "" : "s"}`;
    }
    case "PullRequestEvent":
      return `${e.payload.action} a pull request`;
    case "IssuesEvent":
      return `${e.payload.action} an issue`;
    case "IssueCommentEvent":
      return "commented on an issue";
    case "CreateEvent":
      return `created ${e.payload.ref_type}`;
    case "ReleaseEvent":
      return `${e.payload.action} a release`;
    case "WatchEvent":
      return "starred";
    default:
      return e.type;
  }
}

async function detail(e: { type: string; repo?: { name: string }; payload: Record<string, unknown> }): Promise<string> {
  const payload = e.payload;
  switch (e.type) {
    case "PushEvent": {
      const commits = payload.commits as Array<{ message?: string }> | undefined;
      const head = typeof payload.head === "string" ? payload.head : undefined;
      return commits?.[commits.length - 1]?.message?.split("\n")[0]
        ?? (head ? `commit ${head.slice(0, 7)}` : "push event with no commit details");
    }
    case "PullRequestEvent": {
      const pullRequest = payload.pull_request as { title?: string; number?: number } | undefined;
      if (pullRequest?.title) return pullRequest.title;
      if (pullRequest?.number && e.repo?.name) {
        try {
          const pull = await get<{ title: string }>(`/repos/${e.repo.name}/pulls/${pullRequest.number}`);
          return pull.title;
        } catch {
          return `pull request #${pullRequest.number}`;
        }
      }
      return "pull request details unavailable";
    }
    case "IssuesEvent":
      return ((payload.issue as { title?: string } | undefined)?.title) ?? "issue activity";
    case "IssueCommentEvent":
      return ((payload.issue as { title?: string } | undefined)?.title) ?? "issue comment";
    case "CreateEvent":
      return String(payload.ref ?? payload.ref_type ?? "new repository activity");
    case "ReleaseEvent":
      return String((payload.release as { tag_name?: string } | undefined)?.tag_name ?? "release activity");
    case "WatchEvent":
      return "repository starred";
    default:
      return "public GitHub activity";
  }
}

function eventUrl(e: { type: string; repo?: { name: string }; payload: Record<string, unknown> }): string | undefined {
  const payload = e.payload;
  if (e.type === "PushEvent" && typeof payload.head === "string" && e.repo?.name) {
    return `https://github.com/${e.repo.name}/commit/${payload.head}`;
  }
  if (e.type === "PullRequestEvent") {
    const pullRequest = payload.pull_request as { html_url?: string; number?: number } | undefined;
    return pullRequest?.html_url
      ?? (pullRequest?.number && e.repo?.name
        ? `https://github.com/${e.repo.name}/pull/${pullRequest.number}`
        : undefined);
  }
  if (e.type === "IssuesEvent") {
    return (payload.issue as { html_url?: string } | undefined)?.html_url;
  }
  if (e.type === "IssueCommentEvent") {
    return (payload.issue as { html_url?: string } | undefined)?.html_url;
  }
  if (e.type === "ReleaseEvent") {
    return (payload.release as { html_url?: string } | undefined)?.html_url;
  }
  return undefined;
}

function buildWeeklyCommits(events: { type: string; created_at: string; payload: Record<string, unknown> }[]) {
  const now = new Date();
  const weeks = Array.from({ length: 52 }, (_, index) => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (51 - index) * 7);
    return { weekStart: weekStart.toISOString().slice(0, 10), commits: 0 };
  });

  for (const event of events) {
    if (event.type !== "PushEvent") continue;
    const diffWeeks = Math.floor((now.getTime() - new Date(event.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const index = 51 - diffWeeks;
    if (index >= 0 && index < weeks.length) {
      const commits = event.payload.commits as unknown[] | undefined;
      weeks[index].commits += Math.max(1, commits?.length ?? 0);
    }
  }

  return weeks;
}

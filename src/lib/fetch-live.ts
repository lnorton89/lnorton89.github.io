import type { GithubSnapshot, FeedItem, RefreshableRepo } from "@/lib/types";
import { mergeSnapshot } from "@/lib/merge-snapshot";

const REST = "https://api.github.com";

export class GithubApiError extends Error {
  constructor(
    public readonly path: string,
    public readonly status: number,
    public readonly rateLimitRemaining: string | null,
    public readonly rateLimitReset: string | null,
    public readonly retryAfter: string | null,
  ) {
    super(`GitHub API ${path} failed: ${status}`);
    this.name = "GithubApiError";
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${REST}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new GithubApiError(
      path,
      res.status,
      res.headers.get("x-ratelimit-remaining"),
      res.headers.get("x-ratelimit-reset"),
      res.headers.get("retry-after"),
    );
  }
  return res.json();
}

// Refreshes the parts of the snapshot that unauthenticated REST calls can see.
// Keep this to three requests per refresh: browsers share GitHub's 60 req/hr
// anonymous limit, so per-repository language or tree requests are not safe to
// poll. Fresh repository metadata is merged by fullName over the build-time
// records (see mergeSnapshot) so enriched fields are never lost.
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

  const refreshableRepos: RefreshableRepo[] = repos
    .filter((r) => !r.fork && !r.archived)
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

  const feed: FeedItem[] = await Promise.all(events
    .filter((e) =>
      ["PushEvent", "PullRequestEvent", "IssuesEvent", "IssueCommentEvent", "CreateEvent", "ReleaseEvent", "WatchEvent"]
        .includes(e.type)
    )
    .slice(0, 30)
    .map(async (e) => ({
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

  return mergeSnapshot(
    base,
    {
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
      repos: refreshableRepos,
      feed,
    },
    new Date().toISOString()
  );
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
      return pullRequest?.number ? `pull request #${pullRequest.number}` : "pull request details unavailable";
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
    const comment = payload.comment as { html_url?: string } | undefined;
    const issue = payload.issue as { html_url?: string } | undefined;
    return comment?.html_url ?? issue?.html_url;
  }
  if (e.type === "ReleaseEvent") {
    return (payload.release as { html_url?: string } | undefined)?.html_url;
  }
  return undefined;
}

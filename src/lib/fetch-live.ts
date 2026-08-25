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
// Runs entirely in the browser, so it's rate-limited to 60 req/hr per visitor IP —
// fine for a personal "sync now" button, not for polling on an interval.
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

  const topRepos: RepoSummary[] = repos
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
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

  const feed: FeedItem[] = events.slice(0, 30).map((e) => ({
    id: e.id,
    type: e.type,
    repo: e.repo?.name ?? "",
    createdAt: e.created_at,
    summary: summarize(e),
  }));

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
    topRepos,
    feed,
  };
}

function summarize(e: { type: string; payload: Record<string, unknown> }): string {
  switch (e.type) {
    case "PushEvent": {
      const commits = e.payload.commits as unknown[] | undefined;
      return `pushed ${commits?.length ?? 0} commit${commits?.length === 1 ? "" : "s"}`;
    }
    case "PullRequestEvent":
      return `${e.payload.action} a pull request`;
    case "IssuesEvent":
      return `${e.payload.action} an issue`;
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

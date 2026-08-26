export interface Profile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  createdAt: string;
  htmlUrl: string;
}

// Repository fields the unauthenticated REST refresh can genuinely supply.
// These are the only repo fields a manual "Sync now" may overwrite.
export interface RefreshableRepo {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  /** GitHub REST open_issues_count: open issues AND pull requests. */
  openIssues: number;
  pushedAt: string;
  createdAt: string;
  topics: string[];
  visibility: string;
}

// Fields computed at build time (language byte counts from /languages and
// recognized-file counts from recursive trees). The browser refresh never touches
// these; they must survive a manual refresh untouched.
export interface EnrichedRepo {
  languages?: Record<string, number>;
  languageFiles?: Record<string, number>;
  /** False when the recursive Git tree was truncated or failed to fetch. */
  languageFilesComplete?: boolean;
}

export interface RepoSummary extends RefreshableRepo, EnrichedRepo {}

export interface PinnedRepo {
  name: string;
  /** Repository identity (owner/name), used to match refreshed metadata. */
  fullName: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
  homepage?: string | null;
  visibility?: string;
  /** Combined open issue + pull-request count when sourced from REST. */
  openIssues?: number;
  createdAt?: string;
  topics?: string[];
}

export interface FeedItem {
  id: string;
  type: string;
  repo: string;
  createdAt: string;
  summary: string;
  detail?: string;
  url?: string;
  commits?: FeedCommit[];
  /** GitHub event action, used to avoid grouping unlike actions together. */
  action?: string;
  /** Push/Create ref when available. */
  ref?: string;
  /** Authoritative PushEvent payload.size when available. */
  pushSize?: number;
}

export interface FeedCommit {
  sha: string;
  message: string;
  url?: string;
}

export interface WeeklyCommits {
  weekStart: string;
  /** Known commits from covered repositories. Coverage qualifies completeness. */
  commits: number | null;
}

export interface ContributionDay {
  date: string;
  contributionCount: number;
  weekday: number;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionsCollection {
  contributionCalendar: {
    totalContributions: number;
    weeks: ContributionWeek[];
  };
  totalCommitContributions: number;
  totalPullRequestContributions: number;
  totalIssueContributions: number;
  totalRepositoryContributions: number;
}

// The persisted snapshot. Two kinds of data live side by side and must never
// overwrite each other:
//   - build-snapshot fields: computed by scripts/fetch-github-data.mjs at build
//     time (language bytes, recognized-file counts, contribution calendar,
//     weekly commit history). A manual client refresh carries these through.
//   - refreshable fields: cheap enough for an unauthenticated browser request
//     (profile, repo metadata, recent events). Only these change on "Sync now".
export interface GithubSnapshot {
  /** When the build-time snapshot was generated (scripts/fetch-github-data.mjs). */
  generatedAt: string;
  /** Last successful manual client refresh, or null before the user syncs. */
  refreshedAt: string | null;
  profile: Profile;
  languageTotals: Record<string, number>;
  topRepos: RepoSummary[];
  pinnedRepos: PinnedRepo[] | null;
  feed: FeedItem[];
  weeklyCommits: WeeklyCommits[];
  weeklyCommitsCoverage: WeeklyCommitsCoverage;
  contributions: ContributionsCollection | null;
  hasLiveContributionData: boolean;
  scope: SnapshotScope;
}

export interface WeeklyCommitsCoverage {
  complete: boolean;
  eligibleRepos: number;
  coveredRepos: number;
  pendingRepos: number;
  failedRepos: number;
  pendingRepoNames?: string[];
  failedRepoNames?: string[];
}

// Explains what the dashboard's tracked repository set covers versus the full
// profile, so labels never imply all public repositories were aggregated.
export interface SnapshotScope {
  /** profile.public_repos — the full public repository count. */
  totalPublicRepos: number;
  /** Non-fork, non-archived repositories that the dashboard actually tracks. */
  trackedRepos: number;
  excludedForks: number;
  excludedArchived: number;
}

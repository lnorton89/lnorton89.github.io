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
  openIssues: number;
  pushedAt: string;
  createdAt: string;
  topics: string[];
  visibility: string;
}

// Fields computed at build time (language byte counts from /languages and
// source-file counts from recursive trees). The browser refresh never touches
// these; they must survive a manual refresh untouched.
export interface EnrichedRepo {
  languages?: Record<string, number>;
  languageFiles?: Record<string, number>;
}

export interface RepoSummary extends RefreshableRepo, EnrichedRepo {}

export interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
  homepage?: string | null;
  visibility?: string;
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
}

export interface FeedCommit {
  sha: string;
  message: string;
  url?: string;
}

export interface WeeklyCommits {
  weekStart: string;
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
//     time (language bytes, source-file counts, contribution calendar, weekly
//     commit history). A manual client refresh carries these through verbatim.
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
}

export interface WeeklyCommitsCoverage {
  complete: boolean;
  eligibleRepos: number;
  coveredRepos: number;
  pendingRepos: number;
  failedRepos: number;
}

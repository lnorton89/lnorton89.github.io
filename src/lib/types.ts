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

export interface RepoSummary {
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

export interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
}

export interface FeedItem {
  id: string;
  type: string;
  repo: string;
  createdAt: string;
  summary: string;
  detail?: string;
}

export interface WeeklyCommits {
  weekStart: string;
  commits: number;
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

export interface GithubSnapshot {
  generatedAt: string;
  profile: Profile;
  languageTotals: Record<string, number>;
  topRepos: RepoSummary[];
  pinnedRepos: PinnedRepo[] | null;
  feed: FeedItem[];
  weeklyCommits: WeeklyCommits[];
  contributions: ContributionsCollection | null;
  hasLiveContributionData: boolean;
}

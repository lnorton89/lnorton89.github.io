import type {
  GithubSnapshot,
  Profile,
  FeedItem,
  RefreshableRepo,
  RepoSummary,
} from "@/lib/types";

// A manual "Sync now" can only ever supply these fields. Everything else in a
// GithubSnapshot is build-time data (language bytes, recognized-file counts,
// contribution calendar, weekly commit history) and is carried through unchanged.
export interface ClientRefresh {
  profile: Profile;
  repos: RefreshableRepo[];
  feed: FeedItem[];
}

function mergeRepo(baseRepo: RepoSummary | undefined, freshRepo: RefreshableRepo | undefined): RepoSummary | null {
  const record = freshRepo ?? baseRepo;
  if (!record) return null;

  return {
    ...baseRepo,
    ...freshRepo,
    ...record,
    fullName: record.fullName,
    // Build-only enrichment must always survive a browser refresh. Keep these
    // together so completeness flags cannot silently drift away from the data
    // they qualify.
    languages: baseRepo?.languages,
    languageFiles: baseRepo?.languageFiles,
    languageFilesComplete: baseRepo?.languageFilesComplete,
  };
}

// Merges freshly fetched repository metadata into the build-time records by
// fullName instead of replacing them. Build-time enrichment always wins; only
// fields the cheap browser refresh can actually see come from `fresh`.
export function mergeRepos(base: RepoSummary[], fresh: RefreshableRepo[]): RepoSummary[] {
  const baseByFullName = new Map(base.map((repo) => [repo.fullName, repo]));
  const freshByFullName = new Map(fresh.map((repo) => [repo.fullName, repo]));
  const allFullNames = new Set([...baseByFullName.keys(), ...freshByFullName.keys()]);

  const merged: RepoSummary[] = [];
  for (const fullName of allFullNames) {
    const record = mergeRepo(baseByFullName.get(fullName), freshByFullName.get(fullName));
    if (record) merged.push(record);
  }

  return merged.sort(
    (a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime()
  );
}

// Merges a client refresh over the build-time snapshot. Only the profile,
// repository metadata, and recent events are replaced; the build-snapshot
// datasets (language totals, weekly commits, contributions) are untouched.
export function mergeSnapshot(
  base: GithubSnapshot,
  refresh: ClientRefresh,
  refreshedAt: string
): GithubSnapshot {
  return {
    ...base,
    refreshedAt,
    profile: refresh.profile,
    topRepos: mergeRepos(base.topRepos, refresh.repos),
    feed: refresh.feed,
  };
}

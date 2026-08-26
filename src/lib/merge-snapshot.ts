import type {
  GithubSnapshot,
  Profile,
  FeedItem,
  RefreshableRepo,
  RepoSummary,
} from "@/lib/types";

// A manual "Sync now" can only ever supply these fields. Everything else in a
// GithubSnapshot is build-time data (language bytes, source-file counts,
// contribution calendar, weekly commit history) and is carried through unchanged.
export interface ClientRefresh {
  profile: Profile;
  repos: RefreshableRepo[];
  feed: FeedItem[];
}

// Merges freshly fetched repository metadata into the build-time records by
// fullName instead of replacing them. Build-time enriched fields (languages,
// languageFiles) always win; only the low-cost fields a browser refresh can
// actually see come from `fresh`. A repo missing from the fresh response keeps
// its build-time record instead of being dropped, so a manual refresh can never
// make the grid smaller, emptier, or less complete than the initial snapshot.
export function mergeRepos(base: RepoSummary[], fresh: RefreshableRepo[]): RepoSummary[] {
  const baseByFullName = new Map(base.map((repo) => [repo.fullName, repo]));
  const freshByFullName = new Map(fresh.map((repo) => [repo.fullName, repo]));
  const allFullNames = new Set([...baseByFullName.keys(), ...freshByFullName.keys()]);

  const merged: RepoSummary[] = [];
  for (const fullName of allFullNames) {
    const baseRepo = baseByFullName.get(fullName);
    const freshRepo = freshByFullName.get(fullName);
    const record = freshRepo ?? baseRepo;
    if (!record) continue;
    merged.push({
      // Fresh metadata wins where the refresh can see it; the build-time
      // record is otherwise the floor so no repository is ever lost.
      ...record,
      fullName,
      // Re-assert the build-time enriched fields explicitly so a future
      // refreshable field added to the spread can never clobber them.
      languages: baseRepo?.languages,
      languageFiles: baseRepo?.languageFiles,
    });
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

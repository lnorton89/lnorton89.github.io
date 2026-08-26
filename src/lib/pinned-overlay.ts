import type { PinnedRepo, RepoSummary } from "@/lib/types";

// Pinned-project ordering and identity are build-time GraphQL data (the pinned
// set is not queryable from the unauthenticated REST refresh). After a manual
// refresh, only the underlying repository's cheap metadata can be updated.
// Match by full repository identity (owner/name) — never by bare repo name —
// and keep pinned-only fields (ordering, primary language) untouched.
export function overlayPinnedRepos(
  pinned: PinnedRepo[] | null,
  topRepos: RepoSummary[]
): PinnedRepo[] | null {
  if (!pinned) return null;
  const byFullName = new Map(topRepos.map((repo) => [repo.fullName, repo]));
  return pinned.map((repo) => {
    const fresh = byFullName.get(repo.fullName);
    if (!fresh) return repo;
    return {
      ...repo,
      description: fresh.description,
      url: fresh.url,
      stargazerCount: fresh.stars,
      forkCount: fresh.forks,
      homepage: fresh.homepage,
      visibility: fresh.visibility,
      openIssues: fresh.openIssues,
      topics: fresh.topics.length > 0 ? fresh.topics : repo.topics,
    };
  });
}

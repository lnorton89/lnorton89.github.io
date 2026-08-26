import { languageColor } from "@/lib/format";
import type { PinnedRepo, RepoSummary } from "@/lib/types";

// Pinned-project ordering and identity are build-time GraphQL data. A manual
// refresh keeps that set/order but overlays repository metadata available from
// the existing cheap REST response. Match by owner/name, never bare repo name.
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
      // An empty topics array is valid fresh data; do not resurrect stale tags.
      topics: fresh.topics,
      primaryLanguage: fresh.language
        ? { name: fresh.language, color: languageColor(fresh.language) }
        : null,
    };
  });
}

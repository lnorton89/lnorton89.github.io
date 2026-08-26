import type { RepoSummary } from "@/lib/types";

export type RepoSort = "updated" | "stars" | "forks" | "name";

export interface RepoFilterOptions {
  search: string;
  language: string | null;
  topic: string | null;
  sortBy: RepoSort;
}

// Pure, testable filtering used by RepoGrid. Language matches against the
// build-time language map; topic against the repo's topics; search against the
// name, description, and topics. Missing language maps simply fail to match.
export function filterRepos(
  repos: RepoSummary[],
  { search, language, topic, sortBy }: RepoFilterOptions
): RepoSummary[] {
  const term = search.trim().toLowerCase();
  const filtered = repos.filter((repo) => {
    const matchesLanguage =
      !language || Object.keys(repo.languages ?? {}).includes(language);
    const matchesTopic = !topic || repo.topics.includes(topic);
    const haystack = [repo.name, repo.description ?? "", ...repo.topics]
      .join(" ")
      .toLowerCase();
    return matchesLanguage && matchesTopic && (!term || haystack.includes(term));
  });

  return filtered.sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "stars":
        return b.stars - a.stars;
      case "forks":
        return b.forks - a.forks;
      default:
        return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
    }
  });
}

// Total files across a repo's recognized language-file map (files whose
// extension maps to a language in the build-time tree walk). Returns null when
// the tree data is unavailable so callers never fall back to an estimated or
// zero count. When the tree was truncated (languageFilesComplete === false),
// returns null as well so a partial count is never presented as authoritative.
export function trackedFileCount(repo: RepoSummary): number | null {
  if (repo.languageFilesComplete === false) return null;
  const files = Object.values(repo.languageFiles ?? {});
  if (files.length === 0) return null;
  const total = files.reduce((sum, count) => sum + count, 0);
  return total > 0 ? total : null;
}

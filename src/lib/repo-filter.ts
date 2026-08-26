import type { RepoSummary } from "@/lib/types";

export type RepoSort = "updated" | "stars" | "forks" | "name";

export interface RepoFilterOptions {
  search: string;
  language: string | null;
  topic: string | null;
  sortBy: RepoSort;
}

// Pure, testable filtering used by RepoGrid. Detailed build-time language maps
// are preferred; a newly discovered repository can still match its known REST
// primary language before the next scheduled build enriches it.
export function filterRepos(
  repos: RepoSummary[],
  { search, language, topic, sortBy }: RepoFilterOptions
): RepoSummary[] {
  const term = search.trim().toLowerCase();
  const filtered = repos.filter((repo) => {
    const detailedLanguages = Object.keys(repo.languages ?? {});
    const matchesLanguage =
      !language || detailedLanguages.includes(language) || repo.language === language;
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

// Total files across a repo's recognized language-file map. A complete empty
// tree is a measured zero; only unavailable/truncated tree data returns null.
export function trackedFileCount(repo: RepoSummary): number | null {
  if (repo.languageFilesComplete === false) return null;
  if (!repo.languageFiles) return null;
  return Object.values(repo.languageFiles).reduce((sum, count) => sum + count, 0);
}

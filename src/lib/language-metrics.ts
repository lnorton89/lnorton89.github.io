import type { RepoSummary } from "@/lib/types";

export interface LanguageMetric {
  name: string;
  /** Aggregated raw GitHub bytes across repositories. */
  bytes: number;
  /** Project-normalized prevalence: each repository contributes at most 1.0,
   *  split proportionally across its languages, so a single large repository
   *  cannot dominate the ranking merely because it contains more bytes. */
  prevalence: number;
}

export interface LanguageMetrics {
  metrics: LanguageMetric[];
  /** Number of repositories with language data (normalization denominator). */
  repoCount: number;
  totalBytes: number;
}

// Computes both the raw-byte and project-normalized language rankings from the
// per-repository language maps. Repositories without language data are ignored.
export function computeLanguageMetrics(repos: RepoSummary[]): LanguageMetrics {
  const bytesByName = new Map<string, number>();
  const prevalenceByName = new Map<string, number>();
  let repoCount = 0;
  let totalBytes = 0;

  for (const repo of repos) {
    const langs = repo.languages;
    if (!langs) continue;
    const repoTotal = Object.values(langs).reduce((sum, n) => sum + n, 0);
    if (repoTotal <= 0) continue;
    repoCount += 1;
    totalBytes += repoTotal;
    for (const [name, bytes] of Object.entries(langs)) {
      bytesByName.set(name, (bytesByName.get(name) ?? 0) + bytes);
      prevalenceByName.set(name, (prevalenceByName.get(name) ?? 0) + bytes / repoTotal);
    }
  }

  const names = new Set([...bytesByName.keys(), ...prevalenceByName.keys()]);
  const metrics = Array.from(names, (name) => ({
    name,
    bytes: bytesByName.get(name) ?? 0,
    prevalence: prevalenceByName.get(name) ?? 0,
  }));

  return { metrics, repoCount, totalBytes };
}

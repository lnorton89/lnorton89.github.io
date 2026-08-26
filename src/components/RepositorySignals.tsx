"use client";

import { GitFork, Hash, Languages, Star, CircleDot } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { revealRepositorySection } from "@/lib/reveal-repositories";
import type { RepoSummary } from "@/lib/types";
import { useLiveDataStore } from "@/store/live-data-store";

export default function RepositorySignals({ repos }: { repos: RepoSummary[] }) {
  const live = useLiveDataStore((state) => state.liveSnapshot);
  const selectedTopic = useLiveDataStore((state) => state.selectedTopic);
  const setSelectedTopic = useLiveDataStore((state) => state.setSelectedTopic);
  const displayedRepos = live?.topRepos ?? repos;
  const stars = displayedRepos.reduce((sum, repo) => sum + repo.stars, 0);
  const forks = displayedRepos.reduce((sum, repo) => sum + repo.forks, 0);
  const issues = displayedRepos.reduce((sum, repo) => sum + repo.openIssues, 0);
  const topics = Object.entries(
    displayedRepos.flatMap((repo) => repo.topics).reduce<Record<string, number>>((counts, topic) => {
      counts[topic] = (counts[topic] ?? 0) + 1;
      return counts;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const toggleTopic = (topic: string) => {
    const next = selectedTopic === topic ? null : topic;
    setSelectedTopic(next);
    if (next) revealRepositorySection();
  };

  const stats = [
    { label: "stars earned", value: stars, icon: Star, color: "text-amber" },
    { label: "community forks", value: forks, icon: GitFork, color: "text-cyan" },
    { label: "open issues", value: issues, icon: CircleDot, color: "text-danger" },
    { label: "languages tracked", value: new Set(displayedRepos.flatMap((repo) => Object.keys(repo.languages ?? {}))).size, icon: Languages, color: "text-cyan" },
  ];

  return (
    <section className="rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
          <Hash className="h-4 w-4 text-amber" aria-hidden="true" />
          Repository signals
        </h2>
        <p className="mt-1 font-mono text-[11px] text-text-faint">
          aggregated across {formatNumber(displayedRepos.length)} active original repositories
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded border border-hairline/60 bg-surface-raised/40 p-3">
            <stat.icon className={`mb-2 h-3.5 w-3.5 ${stat.color}`} aria-hidden="true" />
            <div className="font-display text-2xl font-semibold tabular-nums text-text">{formatNumber(stat.value)}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-text-faint">{stat.label}</div>
          </div>
        ))}
      </div>
      {topics.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline/60 pt-3">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-wide text-text-faint">recurring topics</span>
          {topics.map(([topic, count]) => (
            <button
              key={topic}
              type="button"
              aria-pressed={selectedTopic === topic}
              onClick={() => toggleTopic(topic)}
              className={`rounded-full border px-2 py-1 font-mono text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan ${
                selectedTopic === topic
                  ? "border-cyan/50 bg-cyan/10 text-cyan"
                  : "border-hairline text-text-muted hover:border-cyan/40 hover:text-cyan"
              }`}
            >
              #{topic} <span className="text-text-faint">×{count}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

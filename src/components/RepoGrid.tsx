"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Star, GitFork, ExternalLink, Clock3, ArrowDownAZ } from "lucide-react";
import { useLiveDataStore } from "@/store/live-data-store";
import { languageColor, relativeTime, compactNumber, formatNumber, formatShortDate } from "@/lib/format";
import { filterRepos, trackedFileCount, type RepoSort } from "@/lib/repo-filter";
import { useHydrated } from "@/lib/use-hydrated";
import type { GithubSnapshot } from "@/lib/types";

export default function RepoGrid({ base }: { base: GithubSnapshot }) {
  const live = useLiveDataStore((s) => s.liveSnapshot);
  const selectedLanguage = useLiveDataStore((s) => s.selectedLanguage);
  const setSelectedLanguage = useLiveDataStore((s) => s.setSelectedLanguage);
  const selectedTopic = useLiveDataStore((s) => s.selectedTopic);
  const setSelectedTopic = useLiveDataStore((s) => s.setSelectedTopic);
  const hydrated = useHydrated();
  const repos = (live ?? base).topRepos;
  const [visibleCount, setVisibleCount] = useState(9);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<RepoSort>("updated");
  const [hoveredLanguage, setHoveredLanguage] = useState<{
    key: string;
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const filteredRepos = filterRepos(repos, {
    search,
    language: selectedLanguage,
    topic: selectedTopic,
    sortBy,
  });
  const visibleRepos = filteredRepos.slice(0, visibleCount);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisibleCount(9), 0);
    return () => window.clearTimeout(timeout);
  }, [search, selectedLanguage, selectedTopic, sortBy]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || visibleCount >= filteredRepos.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + 9, filteredRepos.length));
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredRepos.length, visibleCount]);

  function clearFilters() {
    setSelectedLanguage(null);
    setSelectedTopic(null);
    setSearch("");
  }

  function showLanguageTooltip(key: string, label: string, x: number, y: number) {
    const tooltipWidth = 220;
    const nextX = Math.max(12, Math.min(x + 12, window.innerWidth - tooltipWidth - 12));
    const nextY = Math.max(48, Math.min(y - 12, window.innerHeight - 12));
    setHoveredLanguage({ key, label, x: nextX, y: nextY });
  }

  return (
    <div>
      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="sr-only" htmlFor="repo-search">Filter repositories</label>
        <input
          id="repo-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="filter repositories, topics..."
          className="min-w-0 rounded border border-hairline bg-surface-raised/60 px-2.5 py-1.5 font-mono text-[11px] text-text placeholder:text-text-faint focus:border-cyan/60 focus:outline-none"
        />
        <div className="flex items-center gap-1 rounded border border-hairline bg-surface-raised/60 p-1" aria-label="Sort repositories">
          {([
            ["updated", Clock3, "Recently updated"],
            ["stars", Star, "Most stars"],
            ["forks", GitFork, "Most forks"],
            ["name", ArrowDownAZ, "Name A-Z"],
          ] as const).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSortBy(value)}
              aria-label={label}
              aria-pressed={sortBy === value}
              title={label}
              className={`rounded p-1.5 transition-colors ${
                sortBy === value
                  ? "bg-cyan/15 text-cyan"
                  : "text-text-faint hover:bg-surface-raised hover:text-text"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-text-faint" aria-live="polite">
        <p>showing {visibleRepos.length} of {filteredRepos.length} repositories</p>
        {selectedLanguage && (
          <button
            type="button"
            onClick={() => setSelectedLanguage(null)}
            aria-label={`Clear ${selectedLanguage} language filter`}
            className="rounded border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 text-cyan transition-colors hover:bg-cyan/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan"
          >
            ✕ {selectedLanguage}
          </button>
        )}
        {selectedTopic && (
          <button
            type="button"
            onClick={() => setSelectedTopic(null)}
            aria-label={`Clear #${selectedTopic} topic filter`}
            className="rounded border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 text-cyan transition-colors hover:bg-cyan/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan"
          >
            ✕ #{selectedTopic}
          </button>
        )}
        {(selectedLanguage || selectedTopic || search) && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded border border-hairline px-2 py-1 text-text-muted transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            clear all
          </button>
        )}
      </div>

      {filteredRepos.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-surface/70 px-4 py-8 text-center">
          <p className="font-mono text-sm text-text-muted">No repositories match the current filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 rounded border border-hairline px-3 py-1.5 font-mono text-[11px] text-text-muted transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRepos.map((repo, i) => {
            const languages = Object.entries(repo.languages ?? {}).sort((a, b) => b[1] - a[1]);
            const languageTotal = languages.reduce((sum, [, bytes]) => sum + bytes, 0);
            const hasSelectedLanguage = !selectedLanguage
              || languages.some(([language]) => language === selectedLanguage)
              || repo.language === selectedLanguage;
            const trackedFileCountValue = trackedFileCount(repo);

            return (
              <motion.article
                key={repo.fullName}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                whileHover={{ y: -3, borderColor: "var(--cyan)" }}
                whileTap={{ scale: 0.985 }}
                className={`group relative flex flex-col gap-3 rounded-lg border border-hairline bg-surface/80 p-4 pb-3 backdrop-blur-sm transition-[border-color,opacity,transform,background-color] ${
                  selectedLanguage && !hasSelectedLanguage ? "opacity-45" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-start justify-between gap-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan"
                  >
                    <h3 className="truncate font-display text-[15px] font-semibold text-text">{repo.name}</h3>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-faint transition-opacity group-hover:text-cyan" aria-hidden="true" />
                  </a>
                </div>

                <p className="min-h-[32px] line-clamp-2 text-xs text-text-muted">
                  {repo.description || "No description — open repository"}
                </p>
                <div className="truncate font-mono text-[10px] text-text-faint">
                  {repo.visibility} · {repo.openIssues} open issues + PRs · since {new Date(repo.createdAt).getUTCFullYear()}
                </div>
                {repo.homepage && (
                  <a
                    href={repo.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-[10px] text-cyan hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan"
                  >
                    Live site: {repo.homepage.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {!!repo.topics.length && <div className="truncate font-mono text-[10px] text-text-faint">#{repo.topics.join(" #")}</div>}
                <div className="font-mono text-[10px] text-text-faint">
                  {trackedFileCountValue !== null
                    ? `${formatNumber(trackedFileCountValue)} recognized files`
                    : "file counts unavailable"}
                </div>

                <div className="mt-auto flex items-center gap-3 border-t border-hairline/60 pt-2 font-mono text-[11px] text-text-faint">
                  {repo.language && (
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <span className="h-2 w-2 rounded-full" style={{ background: languageColor(repo.language) }} />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    {compactNumber(repo.stars)}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3 w-3" aria-hidden="true" />
                    {compactNumber(repo.forks)}
                  </span>
                  <span className="ml-auto">{hydrated ? relativeTime(repo.pushedAt) : formatShortDate(repo.pushedAt)}</span>
                </div>

                {languages.length > 0 && languageTotal > 0 && (
                  <div className="flex h-7 w-full items-center" aria-label="Language distribution">
                    {languages.map(([language, bytes], languageIndex) => {
                      const pct = (bytes / languageTotal) * 100;
                      const key = `${repo.fullName}:${language}`;
                      return (
                        <button
                          key={language}
                          type="button"
                          title={`Filter by ${language}`}
                          aria-pressed={selectedLanguage === language}
                          aria-label={`${language} ${pct.toFixed(1)}%`}
                          onClick={() => setSelectedLanguage(selectedLanguage === language ? null : language)}
                          onPointerEnter={(event) => showLanguageTooltip(key, `${language} ${pct.toFixed(1)}%`, event.clientX, event.clientY)}
                          onPointerMove={(event) => showLanguageTooltip(key, `${language} ${pct.toFixed(1)}%`, event.clientX, event.clientY)}
                          onPointerLeave={() => setHoveredLanguage(null)}
                          onFocus={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            showLanguageTooltip(key, `${language} ${pct.toFixed(1)}%`, rect.left + rect.width / 2, rect.top);
                          }}
                          onBlur={() => setHoveredLanguage(null)}
                          className={`flex h-7 items-center transition-opacity focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan ${
                            selectedLanguage && selectedLanguage !== language ? "opacity-35" : ""
                          } ${
                            hoveredLanguage && hoveredLanguage.key !== key && hoveredLanguage.key.startsWith(`${repo.fullName}:`)
                              ? "opacity-35"
                              : "opacity-100"
                          }`}
                          style={{ width: `${pct}%` }}
                        >
                          <span
                            className={`block h-1.5 w-full transition-transform ${hoveredLanguage?.key === key ? "scale-y-150" : ""} ${
                              languageIndex === 0 ? "rounded-l-full" : ""
                            } ${languageIndex === languages.length - 1 ? "rounded-r-full" : ""}`}
                            style={{ background: languageColor(language) }}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      )}

      {visibleCount < filteredRepos.length && (
        <div ref={loadMoreRef} className="h-8" aria-hidden="true" />
      )}

      {hoveredLanguage && typeof document !== "undefined" && createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-[220px] -translate-y-full rounded-md border border-hairline bg-surface-raised px-2.5 py-1.5 text-center font-mono text-[11px] text-text shadow-lg"
          style={{ left: hoveredLanguage.x, top: hoveredLanguage.y }}
        >
          {hoveredLanguage.label}
        </div>,
        document.body
      )}
    </div>
  );
}

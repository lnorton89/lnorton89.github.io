"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Star, GitFork, ExternalLink, Clock3, ArrowDownAZ } from "lucide-react";
import { useLiveDataStore } from "@/store/live-data-store";
import { languageColor, relativeTime, compactNumber } from "@/lib/format";
import type { GithubSnapshot } from "@/lib/types";

type RepoSort = "updated" | "stars" | "forks" | "name";

export default function RepoGrid({ base }: { base: GithubSnapshot }) {
  const live = useLiveDataStore((s) => s.liveSnapshot);
  const selectedLanguage = useLiveDataStore((s) => s.selectedLanguage);
  const setSelectedLanguage = useLiveDataStore((s) => s.setSelectedLanguage);
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
  const filteredRepos = repos
    .filter((repo) => {
      const matchesLanguage = !selectedLanguage || Object.keys(repo.languages ?? {}).includes(selectedLanguage);
      const haystack = [repo.name, repo.description ?? "", ...repo.topics].join(" ").toLowerCase();
      return matchesLanguage && (!search.trim() || haystack.includes(search.trim().toLowerCase()));
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "stars") return b.stars - a.stars;
      if (sortBy === "forks") return b.forks - a.forks;
      return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
    });
  const visibleRepos = filteredRepos.slice(0, visibleCount);

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

  function showLanguageTooltip(
    key: string,
    label: string,
    x: number,
    y: number
  ) {
    setHoveredLanguage({ key, label, x: x + 12, y: y - 12 });
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
        {(selectedLanguage || search) && (
          <button
            type="button"
            onClick={() => {
              setSelectedLanguage(null);
              setSearch("");
            }}
            className="rounded border border-hairline px-2 py-1.5 font-mono text-[11px] text-text-muted transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            clear filters
          </button>
        )}
      </div>
      <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[11px] text-text-faint" aria-live="polite">
        <p>
          showing {visibleRepos.length} of {filteredRepos.length} repositories
          {selectedLanguage && <span className="text-cyan"> · {selectedLanguage}</span>}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {visibleRepos.map((repo, i) => {
        const languages = Object.entries(repo.languages ?? {}).sort((a, b) => b[1] - a[1]);
        const languageTotal = languages.reduce((sum, [, bytes]) => sum + bytes, 0);
        const hasSelectedLanguage = languages.some(([language]) => language === selectedLanguage);

        return (
        <motion.a
          key={repo.fullName}
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
          whileHover={{ y: -3, borderColor: "var(--cyan)" }}
          whileTap={{ scale: 0.985 }}
          className={`group relative rounded-lg border border-hairline bg-surface/80 backdrop-blur-sm p-4 pb-3 flex flex-col gap-3 transition-[border-color,opacity,transform,background-color] ${
            selectedLanguage && !hasSelectedLanguage ? "opacity-45" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-display text-[15px] font-semibold text-text truncate">
              {repo.name}
            </h4>
            <ExternalLink className="h-3.5 w-3.5 text-text-faint shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-text-muted line-clamp-2 min-h-[32px]">
            {repo.description || "No description — open repository"}
          </p>
          <div className="truncate font-mono text-[10px] text-text-faint">
            {repo.visibility} · {repo.openIssues} open issues · since {new Date(repo.createdAt).getUTCFullYear()}
          </div>
          {repo.homepage && <div className="truncate font-mono text-[10px] text-cyan">{repo.homepage.replace(/^https?:\/\//, "")}</div>}
          {!!repo.topics.length && <div className="truncate font-mono text-[10px] text-text-faint">#{repo.topics.join(" #")}</div>}
          <div className="flex items-center gap-3 text-[11px] font-mono text-text-faint mt-auto pt-2 border-t border-hairline/60">
            {repo.language && (
              <span className="flex items-center gap-1.5 text-text-muted">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: languageColor(repo.language) }}
                />
                {repo.language}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {compactNumber(repo.stars)}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              {compactNumber(repo.forks)}
            </span>
            <span className="ml-auto">{relativeTime(repo.pushedAt)}</span>
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full" aria-label="Language distribution">
            {languages.map(([language, bytes]) => (
              <span
                key={language}
                role="img"
                tabIndex={0}
                aria-label={`${language} ${((bytes / languageTotal) * 100).toFixed(1)}%`}
                onPointerEnter={(event) =>
                  showLanguageTooltip(
                    `${repo.fullName}:${language}`,
                    `${language} ${((bytes / languageTotal) * 100).toFixed(1)}%`,
                    event.clientX,
                    event.clientY
                  )
                }
                onClick={(event) => {
                  event.preventDefault();
                  setSelectedLanguage(selectedLanguage === language ? null : language);
                }}
                onPointerMove={(event) =>
                  showLanguageTooltip(
                    `${repo.fullName}:${language}`,
                    `${language} ${((bytes / languageTotal) * 100).toFixed(1)}%`,
                    event.clientX,
                    event.clientY
                  )
                }
                onPointerLeave={() => setHoveredLanguage(null)}
                onFocus={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  showLanguageTooltip(
                    `${repo.fullName}:${language}`,
                    `${language} ${((bytes / languageTotal) * 100).toFixed(1)}%`,
                    rect.left + rect.width / 2,
                    rect.top
                  );
                }}
                onBlur={() => setHoveredLanguage(null)}
                className={`h-full transition-[opacity,transform] ${
                  selectedLanguage && selectedLanguage !== language ? "opacity-35" : ""
                } ${
                  hoveredLanguage && hoveredLanguage.key !== `${repo.fullName}:${language}`
                    && hoveredLanguage.key.startsWith(`${repo.fullName}:`)
                    ? "opacity-35"
                    : "opacity-100"
                } ${hoveredLanguage?.key === `${repo.fullName}:${language}` ? "scale-y-150" : ""}`}
                style={{
                  width: `${(bytes / languageTotal) * 100}%`,
                  background: languageColor(language),
                }}
              />
            ))}
          </div>
        </motion.a>
        );
      })}
      </div>
      {visibleCount < filteredRepos.length && (
        <div ref={loadMoreRef} className="h-8" aria-hidden="true" />
      )}
      {hoveredLanguage &&
        typeof document !== "undefined" &&
        createPortal(
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

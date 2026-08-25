"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Star, GitFork, ExternalLink } from "lucide-react";
import { useLiveDataStore } from "@/store/live-data-store";
import { languageColor, relativeTime, compactNumber } from "@/lib/format";
import type { GithubSnapshot } from "@/lib/types";

export default function RepoGrid({ base }: { base: GithubSnapshot }) {
  const live = useLiveDataStore((s) => s.liveSnapshot);
  const selectedLanguage = useLiveDataStore((s) => s.selectedLanguage);
  const setSelectedLanguage = useLiveDataStore((s) => s.setSelectedLanguage);
  const repos = (live ?? base).topRepos;
  const [visibleCount, setVisibleCount] = useState(9);
  const [hoveredLanguage, setHoveredLanguage] = useState<{
    key: string;
    label: string;
    x: number;
    y: number;
  } | null>(null);
  const filteredRepos = selectedLanguage
    ? repos.filter((repo) => Object.keys(repo.languages ?? {}).includes(selectedLanguage))
    : repos;
  const visibleRepos = filteredRepos.slice(0, visibleCount);

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
      <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[11px] text-text-faint" aria-live="polite">
        <p>
          showing {visibleRepos.length} of {filteredRepos.length} repositories
          {selectedLanguage && <span className="text-cyan"> · filtered by {selectedLanguage}</span>}
        </p>
        {selectedLanguage && (
          <button
            type="button"
            onClick={() => setSelectedLanguage(null)}
            className="shrink-0 rounded border border-hairline px-2 py-1 text-text-muted transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            clear filter
          </button>
        )}
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
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
          whileHover={{ y: -3, borderColor: "var(--cyan)" }}
          className={`group rounded-lg border border-hairline bg-surface/80 backdrop-blur-sm p-4 pb-3 flex flex-col gap-3 transition-[border-color,opacity,transform,background-color] ${
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
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 9)}
            className="rounded-md border border-hairline bg-surface-raised px-4 py-2 font-mono text-xs text-text-muted transition-colors hover:border-cyan/60 hover:text-cyan focus-visible:border-cyan"
          >
            load more repositories ({filteredRepos.length - visibleCount} remaining)
          </button>
        </div>
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

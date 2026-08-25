"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Star, GitFork, ExternalLink } from "lucide-react";
import { useLiveDataStore } from "@/store/live-data-store";
import { languageColor, relativeTime, compactNumber } from "@/lib/format";
import type { GithubSnapshot } from "@/lib/types";

export default function RepoGrid({ base }: { base: GithubSnapshot }) {
  const live = useLiveDataStore((s) => s.liveSnapshot);
  const repos = (live ?? base).topRepos;
  const [visibleCount, setVisibleCount] = useState(9);
  const visibleRepos = repos.slice(0, visibleCount);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {visibleRepos.map((repo, i) => {
        const languages = Object.entries(repo.languages ?? {}).sort((a, b) => b[1] - a[1]);
        const languageTotal = languages.reduce((sum, [, bytes]) => sum + bytes, 0);

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
          className="group rounded-lg border border-hairline bg-surface/80 backdrop-blur-sm p-4 pb-3 flex flex-col gap-3 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-display text-[15px] font-semibold text-text truncate">
              {repo.name}
            </h4>
            <ExternalLink className="h-3.5 w-3.5 text-text-faint shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-text-muted line-clamp-2 min-h-[32px]">
            {repo.description || "No description provided."}
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
                title={`${language} ${((bytes / languageTotal) * 100).toFixed(1)}%`}
                className="h-full"
                style={{ width: `${(bytes / languageTotal) * 100}%`, background: languageColor(language) }}
              />
            ))}
          </div>
        </motion.a>
        );
      })}
      </div>
      {visibleCount < repos.length && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 9)}
            className="rounded-md border border-hairline bg-surface-raised px-4 py-2 font-mono text-xs text-text-muted transition-colors hover:border-cyan/60 hover:text-cyan focus-visible:border-cyan"
          >
            load more repositories
          </button>
        </div>
      )}
    </div>
  );
}

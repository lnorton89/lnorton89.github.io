"use client";

import { motion } from "framer-motion";
import { Star, GitFork, ExternalLink } from "lucide-react";
import { useLiveDataStore } from "@/store/live-data-store";
import { languageColor, relativeTime, compactNumber } from "@/lib/format";
import type { GithubSnapshot } from "@/lib/types";

export default function RepoGrid({ base }: { base: GithubSnapshot }) {
  const live = useLiveDataStore((s) => s.liveSnapshot);
  const repos = (live ?? base).topRepos;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {repos.map((repo, i) => (
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
          className="group rounded-lg border border-hairline bg-surface/80 backdrop-blur-sm p-4 flex flex-col gap-3 transition-colors"
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
        </motion.a>
      ))}
    </div>
  );
}

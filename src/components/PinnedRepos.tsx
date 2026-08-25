"use client";

import { motion } from "framer-motion";
import { ExternalLink, GitFork, Pin, Star } from "lucide-react";
import { compactNumber } from "@/lib/format";
import type { PinnedRepo } from "@/lib/types";
import type { RepoSummary } from "@/lib/types";
import { useLiveDataStore } from "@/store/live-data-store";

function repoMetrics(repo: RepoSummary | undefined) {
  if (!repo) return null;
  const files = Object.values(repo.languageFiles ?? {}).reduce((sum, count) => sum + count, 0);
  const bytes = Object.values(repo.languages ?? {}).reduce((sum, count) => sum + count, 0);
  return { files, loc: Math.max(1, Math.round(bytes / 45)) };
}

export default function PinnedRepos({ repos, allRepos }: { repos: PinnedRepo[] | null; allRepos: RepoSummary[] }) {
  const live = useLiveDataStore((state) => state.liveSnapshot);
  const liveRepos = live?.topRepos ?? allRepos;
  if (!repos?.length) return null;

  return (
    <section className="flex h-full flex-col">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
          <Pin className="h-4 w-4 text-amber" aria-hidden="true" />
          Pinned projects
        </h2>
        <p className="mt-1 font-mono text-[11px] text-text-faint">
          a focused set of repositories worth exploring
        </p>
      </div>
      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        {repos.map((repo, index) => (
          (() => {
            const metrics = repoMetrics(liveRepos.find((candidate) => candidate.name === repo.name));
            return (
          <motion.a
            key={repo.url}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            whileHover={{ y: -3, borderColor: "var(--cyan)" }}
            whileTap={{ scale: 0.985 }}
            className="group relative flex flex-col gap-3 rounded-lg border border-hairline bg-surface/80 p-4 pb-3 backdrop-blur-sm transition-[border-color,opacity,transform,background-color] hover:bg-surface-raised/60"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="truncate font-display text-[15px] font-semibold text-text">
                  {repo.name}
                </h3>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-faint transition-colors group-hover:text-amber" aria-hidden="true" />
              </div>
              <p className="mt-2 min-h-[32px] line-clamp-2 text-xs leading-relaxed text-text-muted">
                {repo.description || "No description provided."}
              </p>
              <div className="mt-2 truncate font-mono text-[10px] text-text-faint">
                {repo.visibility ?? "public"} · {repo.openIssues ?? 0} open issues
                {repo.createdAt && ` · since ${new Date(repo.createdAt).getUTCFullYear()}`}
              </div>
              {repo.homepage && <div className="truncate font-mono text-[10px] text-cyan">{repo.homepage.replace(/^https?:\/\//, "")}</div>}
              {!!repo.topics?.length && <div className="truncate font-mono text-[10px] text-text-faint">#{repo.topics.join(" #")}</div>}
              {metrics && <div className="font-mono text-[10px] text-text-faint">{metrics.files.toLocaleString()} files · ~{metrics.loc.toLocaleString()} LOC</div>}
            </div>
            <div className="mt-auto flex items-center gap-3 border-t border-hairline/60 pt-2 font-mono text-[11px] text-text-faint">
              {repo.primaryLanguage && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: repo.primaryLanguage.color }}
                  />
                  {repo.primaryLanguage.name}
                </span>
              )}
              <span className="ml-auto flex items-center gap-1">
                <Star className="h-3 w-3" aria-hidden="true" />
                {compactNumber(repo.stargazerCount)}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="h-3 w-3" aria-hidden="true" />
                {compactNumber(repo.forkCount)}
              </span>
            </div>
            <div
              className="flex h-1.5 w-full overflow-hidden rounded-full"
              aria-label={repo.primaryLanguage ? `${repo.primaryLanguage.name} language` : "Language unavailable"}
            >
              <span
                className="h-full w-full"
                style={{ background: repo.primaryLanguage?.color ?? "var(--hairline)" }}
              />
            </div>
          </motion.a>
            );
          })()
        ))}
      </div>
    </section>
  );
}

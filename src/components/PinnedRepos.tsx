"use client";

import { motion } from "framer-motion";
import { ExternalLink, GitFork, Pin, Star } from "lucide-react";
import { compactNumber } from "@/lib/format";
import type { PinnedRepo } from "@/lib/types";

export default function PinnedRepos({ repos }: { repos: PinnedRepo[] | null }) {
  if (!repos?.length) return null;

  return (
    <section className="pb-14">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
          <Pin className="h-4 w-4 text-amber" aria-hidden="true" />
          Pinned projects
        </h2>
        <p className="mt-1 font-mono text-[11px] text-text-faint">
          a focused set of repositories worth exploring
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {repos.map((repo, index) => (
          <motion.a
            key={repo.url}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            className="group flex min-h-36 flex-col justify-between rounded-lg border border-hairline bg-surface/80 p-4 backdrop-blur-sm transition-colors hover:border-amber/60 hover:bg-surface-raised/60"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="truncate font-display text-[15px] font-semibold text-text">
                  {repo.name}
                </h3>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-faint transition-colors group-hover:text-amber" aria-hidden="true" />
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-muted">
                {repo.description || "No description provided."}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-text-faint">
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
          </motion.a>
        ))}
      </div>
    </section>
  );
}

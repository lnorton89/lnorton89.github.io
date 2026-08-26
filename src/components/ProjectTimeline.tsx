"use client";

import { Calendar, Clock3, Star, Waypoints } from "lucide-react";
import { formatMonthYear, formatNumber } from "@/lib/format";
import type { RepoSummary } from "@/lib/types";
import { useLiveDataStore } from "@/store/live-data-store";

export default function ProjectTimeline({ repos }: { repos: RepoSummary[] }) {
  const live = useLiveDataStore((state) => state.liveSnapshot);
  const displayedRepos = live?.topRepos ?? repos;
  if (!displayedRepos.length) return null;

  const oldest = [...displayedRepos].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))[0];
  const newest = [...displayedRepos].sort((a, b) => +new Date(b.pushedAt) - +new Date(a.pushedAt))[0];
  const starred = [...displayedRepos].sort((a, b) => b.stars - a.stars)[0];
  const spanYears = Math.max(0, new Date(newest.pushedAt).getUTCFullYear() - new Date(oldest.createdAt).getUTCFullYear());
  const milestones = [
    { label: "oldest public project", repo: oldest, date: oldest.createdAt, icon: Calendar, color: "text-text-muted" },
    { label: "most recently active", repo: newest, date: newest.pushedAt, icon: Clock3, color: "text-cyan" },
    { label: "most starred", repo: starred, date: null, icon: Star, color: "text-amber" },
  ];

  return (
    <section className="rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
            <Waypoints className="h-4 w-4 text-cyan" aria-hidden="true" />
            Project timeline
          </h2>
          <p className="mt-1 font-mono text-[11px] text-text-faint">the shape of the public build history</p>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-text-faint">{spanYears} years of public history</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {milestones.map((milestone) => (
          <a
            key={milestone.label}
            href={milestone.repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded border border-hairline/60 bg-surface-raised/30 p-3 transition-colors hover:border-cyan/50 hover:bg-surface-raised/70"
          >
            <milestone.icon className={`mb-3 h-3.5 w-3.5 ${milestone.color}`} aria-hidden="true" />
            <div className="font-mono text-[10px] uppercase tracking-wide text-text-faint">{milestone.label}</div>
            <div className="mt-1 truncate font-display text-sm font-semibold text-text group-hover:text-cyan">{milestone.repo.name}</div>
            <div className="mt-2 font-mono text-[10px] text-text-faint">
              {milestone.date
                ? formatMonthYear(milestone.date)
                : `${formatNumber(milestone.repo.stars)} stars`}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

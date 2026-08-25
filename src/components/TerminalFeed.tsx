"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Activity, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useLiveDataStore } from "@/store/live-data-store";
import { relativeTime } from "@/lib/format";
import type { FeedItem, GithubSnapshot } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  PushEvent: "push",
  PullRequestEvent: "pull request",
  IssuesEvent: "issue",
  CreateEvent: "create",
  ReleaseEvent: "release",
  WatchEvent: "star",
};

const TYPE_BADGE: Record<string, string> = {
  PushEvent: "border-cyan/30 bg-cyan/10 text-cyan",
  PullRequestEvent: "border-amber/30 bg-amber/10 text-amber",
  IssuesEvent: "border-danger/30 bg-danger/10 text-danger",
  CreateEvent: "border-cyan/30 bg-cyan/10 text-cyan",
  ReleaseEvent: "border-amber/30 bg-amber/10 text-amber",
  WatchEvent: "border-amber/30 bg-amber/10 text-amber",
};

const EVENT_LINK_LABEL: Record<string, string> = {
  PushEvent: "commit",
  PullRequestEvent: "PR",
  IssuesEvent: "issue",
  ReleaseEvent: "release",
};

type GroupedFeedItem = FeedItem & {
  activityCount: number;
  isGroupStart: boolean;
};

function groupByRepository(feed: FeedItem[]): GroupedFeedItem[] {
  const grouped = new Map<string, FeedItem[]>();

  for (const item of feed) {
    const items = grouped.get(item.repo) ?? [];
    items.push(item);
    grouped.set(item.repo, items);
  }

  const perRepositoryLimit = grouped.size > 1 ? 3 : 14;
  return Array.from(grouped.values()).flatMap((items) =>
    items.slice(0, perRepositoryLimit).map((item, index) => ({
      ...item,
      activityCount: items.length,
      isGroupStart: index === 0,
    }))
  );
}

function Line({
  item,
  index,
  expanded,
  onToggle,
}: {
  item: GroupedFeedItem;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const typeLabel = TYPE_LABEL[item.type] ?? item.type.replace("Event", "").toLowerCase();

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
      className="group rounded-md border-b border-hairline/50 text-[13px] leading-relaxed transition-colors last:border-0 hover:bg-surface-raised/70 focus-within:bg-surface-raised/70"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`activity-detail-${item.id}`}
        className="flex w-full min-w-0 items-center gap-2.5 px-2 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-faint transition-colors group-hover:text-cyan" aria-hidden="true" />
        )}
        <span className={`inline-flex w-[92px] shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-all group-hover:brightness-125 ${TYPE_BADGE[item.type] ?? "border-hairline bg-surface-raised text-text-muted"}`}>
          {typeLabel}
        </span>
        <span className="min-w-0 max-w-[24%] truncate text-text-muted transition-colors group-hover:text-text">{item.repo}</span>
        <span className="min-w-0 truncate text-text">
          {item.summary}
          {item.detail && <span className="text-text-faint"> — {item.detail}</span>}
        </span>
        {item.isGroupStart && item.activityCount > 1 && (
          <span className="shrink-0 rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-text-faint">
            {item.activityCount} repo events
          </span>
        )}
        <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[11px] text-text-faint">
          {relativeTime(item.createdAt)}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`activity-detail-${item.id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-2 mb-2 rounded border border-hairline/70 bg-bg/50 px-3 py-2.5 font-mono text-[11px]">
              <div className="mb-2 flex items-center justify-between gap-3 text-text-faint">
                <span className="uppercase tracking-wide text-cyan">event detail</span>
                <span className="whitespace-nowrap">{new Date(item.createdAt).toUTCString()}</span>
              </div>
              <p className="mb-2 text-sm leading-relaxed text-text">{item.detail || item.summary}</p>
              <div className="grid gap-1.5 border-t border-hairline/60 pt-2 text-text-faint sm:grid-cols-2">
                <span>type: <span className="text-text-muted">{typeLabel}</span></span>
                <span>repo events: <span className="text-text-muted">{item.activityCount}</span></span>
                <span className="truncate">event id: <span className="text-text-muted">{item.id}</span></span>
                <a
                  href={item.url ?? `https://github.com/${item.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan transition-colors hover:text-text"
                >
                  view {item.url ? EVENT_LINK_LABEL[item.type] ?? "event" : "repository"}{" "}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export default function TerminalFeed({ base }: { base: GithubSnapshot }) {
  const live = useLiveDataStore((s) => s.liveSnapshot);
  const data = live ?? base;
  const items = groupByRepository(data.feed).slice(0, 14);
  const repositoryCount = new Set(data.feed.map((item) => item.repo)).size;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface/80 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-raised/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-cyan/70" />
        <Activity className="ml-2 h-3.5 w-3.5 text-cyan" aria-hidden="true" />
        <span className="truncate font-mono text-xs text-text-muted">
          {data.profile.login}@github — activity
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber" />
          </span>
          <span className="font-mono text-[11px] text-text-faint">live</span>
        </span>
      </div>
      <div className="flex items-center justify-between border-b border-hairline/60 px-4 py-2 font-mono text-[11px] text-text-faint">
        <span><span className="text-cyan">$</span> gh activity --user {data.profile.login}</span>
        <span className="tabular-nums">{repositoryCount} repos · {data.feed.length} events</span>
      </div>
      <ul aria-label="Recent GitHub activity" className="max-h-[340px] overflow-y-auto px-2 py-1.5 scroll-thin">
        <AnimatePresence initial={false}>
          {items.length === 0 && (
            <li className="py-8 text-center font-mono text-sm text-text-faint">
              no public activity in range
            </li>
          )}
          {items.map((item, i) => (
            <Line
              key={item.id}
              item={item}
              index={i}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

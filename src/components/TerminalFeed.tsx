"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLiveDataStore } from "@/store/live-data-store";
import { relativeTime } from "@/lib/format";
import type { FeedItem, GithubSnapshot } from "@/lib/types";

const TYPE_GLYPH: Record<string, string> = {
  PushEvent: "git push",
  PullRequestEvent: "pr",
  IssuesEvent: "issue",
  CreateEvent: "create",
  ReleaseEvent: "release",
  WatchEvent: "star",
};

const TYPE_COLOR: Record<string, string> = {
  PushEvent: "text-cyan",
  PullRequestEvent: "text-amber",
  IssuesEvent: "text-danger",
  CreateEvent: "text-cyan",
  ReleaseEvent: "text-amber",
  WatchEvent: "text-amber",
};

function Line({ item, index }: { item: FeedItem; index: number }) {
  const typeLabel = TYPE_GLYPH[item.type] ?? item.type.replace("Event", "").toLowerCase();

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
      title={item.detail ?? item.summary}
      className="group flex min-w-0 items-center gap-2.5 rounded-md border-b border-hairline/50 px-2 py-2 text-[13px] leading-relaxed transition-colors last:border-0 hover:bg-surface-raised/70 focus-within:bg-surface-raised/70"
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60 transition-opacity group-hover:opacity-100 ${TYPE_COLOR[item.type] ?? "text-text-muted"}`}
      />
      <span className={`w-[70px] shrink-0 font-mono text-[11px] transition-colors ${TYPE_COLOR[item.type] ?? "text-text-muted"}`}>
        {typeLabel}
      </span>
      <span className="min-w-0 shrink-0 truncate text-text-muted transition-colors group-hover:text-text">{item.repo}</span>
      <span className="min-w-0 truncate text-text">{item.summary}</span>
      <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[11px] text-text-faint">
        {relativeTime(item.createdAt)}
      </span>
    </motion.li>
  );
}

export default function TerminalFeed({ base }: { base: GithubSnapshot }) {
  const live = useLiveDataStore((s) => s.liveSnapshot);
  const data = live ?? base;
  const items = data.feed.slice(0, 14);

  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface/80 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-raised/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-cyan/70" />
        <span className="ml-2 truncate font-mono text-xs text-text-muted">
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
        <span className="tabular-nums">{items.length} events</span>
      </div>
      <ul aria-label="Recent GitHub activity" className="max-h-[340px] overflow-y-auto px-2 py-1.5 scroll-thin">
        <AnimatePresence initial={false}>
          {items.length === 0 && (
            <li className="py-8 text-center font-mono text-sm text-text-faint">
              no public activity in range
            </li>
          )}
          {items.map((item, i) => (
            <Line key={item.id} item={item} index={i} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

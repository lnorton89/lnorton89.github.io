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

function Line({ item, index }: { item: FeedItem; index: number }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
      className="flex gap-3 py-2 text-[13px] leading-relaxed border-b border-hairline/60 last:border-0"
    >
      <span className="font-mono text-cyan/80 shrink-0 w-[78px]">
        {TYPE_GLYPH[item.type] ?? item.type.replace("Event", "").toLowerCase()}
      </span>
      <span className="text-text-muted shrink-0">{item.repo}</span>
      <span className="text-text truncate">{item.summary}</span>
      <span className="ml-auto font-mono text-text-faint shrink-0 whitespace-nowrap">
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
    <div className="rounded-lg border border-hairline bg-surface/80 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline bg-surface-raised/60">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-cyan/70" />
        <span className="ml-2 font-mono text-xs text-text-muted">
          {data.profile.login}@github — activity
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber" />
          </span>
          <span className="font-mono text-[11px] text-text-faint">live feed</span>
        </span>
      </div>
      <ul className="px-4 py-1 max-h-[340px] overflow-y-auto scroll-thin">
        <AnimatePresence initial={false}>
          {items.length === 0 && (
            <li className="py-6 text-center text-sm text-text-faint font-mono">
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

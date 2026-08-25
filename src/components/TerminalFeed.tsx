"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Activity, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useLiveDataStore } from "@/store/live-data-store";
import { relativeTime } from "@/lib/format";
import type { FeedCommit, FeedItem, GithubSnapshot } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  PushEvent: "push",
  PullRequestEvent: "pull request",
  IssuesEvent: "issue",
  IssueCommentEvent: "comment",
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

type GroupedFeedItem = FeedItem & {
  activityCount: number;
  activities: FeedItem[];
  commits: FeedCommit[];
};

function groupByRepository(feed: FeedItem[]): GroupedFeedItem[] {
  const groups: FeedItem[][] = [];
  for (const item of feed) {
    const previous = groups[groups.length - 1];
    if (previous && previous[0].repo === item.repo && previous[0].type === item.type) {
      previous.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups.slice(0, 24).map((activities) =>
    createGroupedItem(activities, activities.flatMap((activity) => activity.commits ?? []))
  );
}

function createGroupedItem(
  activities: FeedItem[],
  commits: FeedCommit[]
): GroupedFeedItem {
  const first = activities[0];
  const activityCount = first.type === "PushEvent"
    ? commits.length || activities.length
    : activities.length;
  return {
    ...first,
    id: first.id,
    createdAt: first.createdAt,
    summary: groupedSummary(first, activityCount),
    detail: activities.length === 1 ? first.detail : undefined,
    url: first.url,
    activityCount,
    activities,
    commits,
  };
}

function groupedSummary(item: FeedItem, count: number): string {
  if (count === 1) return item.summary;
  if (item.type === "PushEvent") return `pushed ${count} commits`;

  const action = item.summary.split(" ")[0];
  const noun: Record<string, string> = {
    PullRequestEvent: "pull requests",
    IssuesEvent: "issues",
    CreateEvent: "items",
    ReleaseEvent: "releases",
    WatchEvent: "stars",
  };
  return `${action} ${count} ${noun[item.type] ?? "events"}`;
}

function DetailEntry({
  href,
  prefix,
  children,
}: {
  href: string;
  prefix: string;
  children: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2 rounded border border-hairline/60 bg-surface-raised/30 px-2 py-1.5 text-[11px] leading-relaxed text-text transition-colors hover:border-cyan/50 hover:bg-cyan/10 hover:text-cyan focus-visible:border-cyan/50 focus-visible:bg-cyan/10 focus-visible:text-cyan"
    >
      <span className="shrink-0 text-cyan">{prefix}</span>
      <span className="min-w-0 flex-1">{children}</span>
      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-text-faint transition-colors group-hover:text-cyan" aria-hidden="true" />
    </a>
  );
}

function Line({
  item,
  index,
  expanded,
  onToggle,
  hydrated,
}: {
  item: GroupedFeedItem;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  hydrated: boolean;
}) {
  const typeLabel = TYPE_LABEL[item.type] ?? item.type.replace("Event", "").toLowerCase();
  const rowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!expanded) return;
    rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [expanded]);

  return (
    <motion.li
      ref={rowRef}
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
        className="grid w-full min-w-0 grid-cols-[auto_auto_1fr_auto] items-center gap-2.5 px-2 py-2 text-left sm:flex"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-faint transition-colors group-hover:text-cyan" aria-hidden="true" />
        )}
        <span className={`inline-flex w-auto shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-all group-hover:brightness-125 sm:w-[92px] ${TYPE_BADGE[item.type] ?? "border-hairline bg-surface-raised text-text-muted"}`}>
          {typeLabel}
        </span>
        <span className="col-start-2 min-w-0 max-w-full truncate text-text-muted transition-colors group-hover:text-text sm:w-[24%] sm:shrink-0">{item.repo}</span>
        <span className="col-span-3 col-start-2 min-w-0 truncate text-text sm:col-auto sm:flex-1">
          {item.summary}
          {item.type === "PushEvent" && item.commits.length > 0 ? (
            <span className="text-text-faint"> — {item.commits.map((commit) => commit.sha.slice(0, 7)).join(", ")}</span>
          ) : (
            item.detail && <span className="text-text-faint"> — {item.detail}</span>
          )}
        </span>
        {item.activityCount > 1 && (
          <span className="shrink-0 rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-text-faint">
            {item.activityCount} {item.type === "PushEvent" ? "commits" : "events"}
          </span>
        )}
        <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[11px] text-text-faint">
          {hydrated ? relativeTime(item.createdAt) : "recently"}
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
              <div className="mb-2 space-y-1.5">
                {item.type === "PushEvent" && item.commits.length > 0
                  ? item.commits.map((commit) => (
                      <DetailEntry
                        key={commit.sha}
                        href={commit.url ?? item.url ?? `https://github.com/${item.repo}/commit/${commit.sha}`}
                        prefix={commit.sha.slice(0, 7)}
                      >
                        {commit.message}
                      </DetailEntry>
                    ))
                  : item.activities.map((activity) => (
                      <DetailEntry
                        key={activity.id}
                        href={activity.url ?? `https://github.com/${activity.repo}`}
                        prefix={hydrated ? relativeTime(activity.createdAt) : "recently"}
                      >
                        {activity.detail || activity.summary}
                      </DetailEntry>
                    ))}
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
  const items = groupByRepository(data.feed).slice(0, 24);
  const repositoryCount = new Set(data.feed.map((item) => item.repo)).size;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

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
      <ul aria-label="Recent GitHub activity" className="max-h-[460px] overflow-y-auto px-2 py-1.5 scroll-thin">
        <AnimatePresence initial={false}>
          {items.length === 0 && (
            <li className="py-8 text-center font-mono text-sm text-text-faint">
              No public activity in range
            </li>
          )}
          {items.map((item, i) => (
            <Line
              key={item.id}
              item={item}
              index={i}
              expanded={expandedId === item.id}
              hydrated={hydrated}
              onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

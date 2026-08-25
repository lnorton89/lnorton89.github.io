"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { ContributionsCollection, WeeklyCommits } from "@/lib/types";

function intensity(count: number, max: number): number {
  if (max <= 0) return 0;
  const ratio = count / max;
  if (ratio === 0) return 0;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

const CELL_STYLES = [
  "bg-surface-raised",
  "bg-amber-dim/50",
  "bg-amber-dim",
  "bg-amber/70",
  "bg-amber shadow-[0_0_10px_rgba(232,163,61,0.65)]",
];

// Renders the real GraphQL contribution calendar when available (server has a
// token); otherwise falls back to the build-time weekly-commit approximation
// derived from public push events, clearly labeled as such.
export default function ContributionHeatmap({
  contributions,
  weeklyFallback,
}: {
  contributions: ContributionsCollection | null;
  weeklyFallback: WeeklyCommits[];
}) {
  const grid = useMemo(() => {
    if (contributions) {
      const weeks = contributions.contributionCalendar.weeks;
      const max = Math.max(1, ...weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount)));
      return {
        max,
        columns: weeks.map((w) =>
          w.contributionDays.map((d) => ({
            key: d.date,
            count: d.contributionCount,
            label: `${d.contributionCount} contribution${d.contributionCount === 1 ? "" : "s"} on ${d.date}`,
          }))
        ),
      };
    }
    const max = Math.max(1, ...weeklyFallback.map((w) => w.commits));
    return {
      max,
      columns: weeklyFallback.map((w) => [
        ...Array.from({ length: 7 }, (_, weekday) => ({
          key: `${w.weekStart}-${weekday}`,
          count: weekday === 3 ? w.commits : 0,
          label:
            weekday === 3
              ? `${w.commits} commit${w.commits === 1 ? "" : "s"} in the week of ${w.weekStart}`
              : `No commits in the week of ${w.weekStart}`,
        })),
      ]),
    };
  }, [contributions, weeklyFallback]);

  const total = contributions?.contributionCalendar.totalContributions;

  return (
    <div className="min-w-0 rounded-lg border border-hairline bg-surface/80 backdrop-blur-sm p-5">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-sm font-semibold tracking-wide text-text uppercase">
          Contribution pulse
        </h3>
        <span className="font-mono text-xs text-text-muted">
          {total !== undefined
            ? `${total.toLocaleString()} contributions, last 12 months`
            : "approximate — recent public push activity"}
        </span>
      </div>
      <div className="grid w-full min-w-[560px] grid-flow-col auto-cols-fr gap-[3px] overflow-x-auto scroll-thin pb-2">
        {grid.columns.map((col, ci) => (
          <div key={ci} className="grid grid-rows-7 gap-[3px] min-w-[9px]">
            {col.map((cell, ri) => (
              <motion.div
                key={cell.key}
                title={cell.label}
                initial={{ opacity: 0, scale: 0.4 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.25, delay: (ci * col.length + ri) * 0.002 }}
                className={`aspect-square w-full rounded-[2px] ${CELL_STYLES[intensity(cell.count, grid.max)]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="font-mono text-[11px] text-text-faint mr-1">less</span>
        {CELL_STYLES.map((style, i) => (
          <span key={i} className={`h-[10px] w-[10px] rounded-[2px] ${style}`} />
        ))}
        <span className="font-mono text-[11px] text-text-faint ml-1">more</span>
      </div>
    </div>
  );
}

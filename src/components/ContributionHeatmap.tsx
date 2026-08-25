"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Activity } from "lucide-react";
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
  embedded = false,
}: {
  contributions: ContributionsCollection | null;
  weeklyFallback: WeeklyCommits[];
  embedded?: boolean;
}) {
  const [hovered, setHovered] = useState<{ label: string; x: number; y: number } | null>(null);

  function showTooltipAt(x: number, y: number, label: string) {
    setHovered({ label, x: x + 12, y: y - 12 });
  }

  function showTooltipForFocus(element: HTMLElement, label: string) {
    const rect = element.getBoundingClientRect();
    setHovered({ label, x: rect.left + rect.width / 2, y: rect.top });
  }

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
    <div className={`min-w-0 ${embedded ? "" : "rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm"}`}>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
          <Activity className="h-4 w-4 text-amber" aria-hidden="true" />
          Contribution pulse
        </h3>
        <span className="font-mono text-xs text-text-muted">
          {total !== undefined
            ? `${total.toLocaleString()} contributions, last 12 months`
            : "Approximate — recent public push activity"}
        </span>
      </div>
      <div
        role="grid"
        aria-label="Contribution activity by day"
        className="grid w-full min-w-[560px] grid-flow-col auto-cols-fr gap-[3px] overflow-x-auto scroll-thin pb-2"
      >
        {grid.columns.map((col, ci) => (
          <div key={ci} className="grid grid-rows-7 gap-[3px] min-w-[9px]">
            {col.map((cell, ri) => (
              <motion.div
                key={cell.key}
                role="gridcell"
                tabIndex={0}
                aria-label={cell.label}
                onPointerEnter={(event) => showTooltipAt(event.clientX, event.clientY, cell.label)}
                onPointerMove={(event) => showTooltipAt(event.clientX, event.clientY, cell.label)}
                onPointerLeave={() => setHovered(null)}
                onFocus={(event) => showTooltipForFocus(event.currentTarget, cell.label)}
                onBlur={() => setHovered(null)}
                initial={{ opacity: 0, scale: 0.4 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.25, delay: (ci * col.length + ri) * 0.002 }}
                className={`aspect-square w-full cursor-pointer rounded-[2px] transition-[filter,box-shadow] hover:brightness-125 hover:ring-1 hover:ring-cyan/70 focus-visible:ring-1 focus-visible:ring-cyan ${CELL_STYLES[intensity(cell.count, grid.max)]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-right font-mono text-[11px] text-text-faint sm:hidden">
        scroll horizontally to explore
      </p>
      {hovered &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 max-w-[220px] -translate-y-full rounded-md border border-hairline bg-surface-raised px-2.5 py-1.5 text-center font-mono text-[11px] text-text shadow-lg"
            style={{ left: hovered.x, top: hovered.y }}
          >
            {hovered.label}
          </div>,
          document.body
        )}
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

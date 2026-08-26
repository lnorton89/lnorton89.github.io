"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatNumber } from "@/lib/format";
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

// Renders the real GraphQL contribution calendar when available (build had a
// token). Otherwise it shows an explicitly WEEKLY view built from the build-time
// per-contributor commit statistics — one datum per week, never fabricated
// daily cells — and is labeled as account-attributed public commit activity.
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
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const fallbackComplete = weeklyFallback.every((week) => week.commits !== null);
  const isCalendar = Boolean(contributions);

  const calendarTotalWeeks = contributions?.contributionCalendar.weeks.length ?? 52;
  const [windowWeeks, setWindowWeeks] = useState<number>(() => calendarTotalWeeks);
  const isFullCalendarRange = isCalendar && windowWeeks >= calendarTotalWeeks;

  function showTooltipAt(x: number, y: number, label: string) {
    setHovered({ label, x: x + 12, y: y - 12 });
  }

  function showTooltipForFocus(element: HTMLElement, label: string) {
    const rect = element.getBoundingClientRect();
    setHovered({ label, x: rect.left + rect.width / 2, y: rect.top });
  }

  // Daily (calendar) or weekly (fallback) data, always in column-major form.
  const grid = useMemo(() => {
    if (contributions) {
      const allWeeks = contributions.contributionCalendar.weeks;
      const visibleWeeks =
        windowWeeks >= allWeeks.length ? allWeeks : allWeeks.slice(-windowWeeks);
      const max = Math.max(1, ...visibleWeeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount)));
      return {
        daily: true as const,
        max,
        columns: visibleWeeks.map((w) =>
          w.contributionDays.map((d) => ({
            key: d.date,
            count: d.contributionCount,
            label: `${d.contributionCount} contribution${d.contributionCount === 1 ? "" : "s"} on ${d.date}`,
          }))
        ),
      };
    }
    const weeks = weeklyFallback.slice(-windowWeeks);
    const max = Math.max(1, ...weeks.map((w) => w.commits ?? 0));
    return {
      daily: false as const,
      max,
      columns: weeks.map((w) => [
        {
          key: w.weekStart,
          count: w.commits ?? 0,
          label: `${w.commits ?? 0} commit${w.commits === 1 ? "" : "s"} in the week of ${w.weekStart}`,
        },
      ]),
    };
  }, [contributions, weeklyFallback, windowWeeks]);

  const visibleColumns = grid.columns;
  const total =
    isFullCalendarRange && contributions
      ? contributions.contributionCalendar.totalContributions
      : visibleColumns.reduce(
          (sum, column) => sum + column.reduce((columnTotal, cell) => columnTotal + cell.count, 0),
          0
        );
  const totalLabel = isCalendar
    ? isFullCalendarRange
      ? `${formatNumber(total)} contributions in the last year`
      : `${formatNumber(total)} contributions in selected ${visibleColumns.length} weeks`
    : `${formatNumber(total)} commits in selected ${visibleColumns.length} weeks`;

  const selectorOptions = isCalendar
    ? [
        { weeks: 13, label: "13w" },
        { weeks: 26, label: "26w" },
        { weeks: calendarTotalWeeks, label: calendarTotalWeeks <= 52 ? "52w" : "1y" },
      ]
    : [
        { weeks: 13, label: "13w" },
        { weeks: 26, label: "26w" },
        { weeks: 52, label: "52w" },
      ];

  return (
    <div className={`flex h-full min-w-0 flex-col ${embedded ? "" : "rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm"}`}>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-sm font-semibold tracking-wide text-text">
          {isCalendar ? "Contribution pulse" : "Weekly commit activity"}
        </h3>
        <div className="flex items-center rounded border border-hairline p-0.5" aria-label="Activity time window">
            {selectorOptions.map(({ weeks, label }) => (
              <button
                key={weeks}
                type="button"
                onClick={() => {
                  setWindowWeeks(weeks);
                  setFocusedCell(null);
                }}
                aria-pressed={windowWeeks === weeks}
                className={`rounded px-1.5 py-1 font-mono text-[10px] transition-colors ${
                  windowWeeks === weeks ? "bg-amber/15 text-amber" : "text-text-faint hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
        </div>
      </div>
      {!contributions && !fallbackComplete ? (
        <p className="flex min-h-[120px] items-center justify-center text-center font-mono text-xs text-text-faint">
          Commit activity is unavailable because the build-time dataset is incomplete.
        </p>
      ) : grid.daily ? (
      <ContributionGrid
        columns={grid.columns}
        max={grid.max}
        focusedCell={focusedCell}
        onFocusCell={setFocusedCell}
        onHover={showTooltipAt}
        onHoverEnd={() => setHovered(null)}
        onFocusShowTooltip={showTooltipForFocus}
      />
      ) : (
      <WeeklyBars
        weeks={grid.columns.map((column) => column[0])}
        max={grid.max}
        focusedKey={focusedCell}
        onFocusKey={setFocusedCell}
        onHover={showTooltipAt}
        onHoverEnd={() => setHovered(null)}
        onFocusShowTooltip={showTooltipForFocus}
      />
      )}
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
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <span className="font-mono text-xs text-text-muted">{totalLabel}</span>
        <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] text-text-faint mr-1">less</span>
        {CELL_STYLES.map((style, i) => (
          <span key={i} className={`h-[10px] w-[10px] rounded-[2px] ${style}`} />
        ))}
        <span className="font-mono text-[11px] text-text-faint ml-1">more</span>
        </div>
      </div>
    </div>
  );
}

type HeatmapCell = { key: string; count: number; label: string };
type HeatmapColumn = HeatmapCell[];

// Daily contribution calendar with proper grid semantics: DOM is row-major (one
// role "row" per weekday) while CSS places each cell into its visual column so
// weeks stay vertical. A single roving tab stop plus arrow-key movement keeps
// keyboard users out of hundreds of individual tab stops, and hover/focus
// tooltips expose the per-day detail.
function ContributionGrid({
  columns,
  max,
  focusedCell,
  onFocusCell,
  onHover,
  onHoverEnd,
  onFocusShowTooltip,
}: {
  columns: HeatmapColumn[];
  max: number;
  focusedCell: string | null;
  onFocusCell: (key: string | null) => void;
  onHover: (x: number, y: number, label: string) => void;
  onHoverEnd: () => void;
  onFocusShowTooltip: (element: HTMLElement, label: string) => void;
}) {
  const rows = useMemo(
    () =>
      Array.from({ length: 7 }, (_, ri) =>
        columns
          .map((column) => column[ri])
          .filter((cell): cell is HeatmapCell => Boolean(cell))
      ),
    [columns]
  );

  return (
    <div className="w-full overflow-x-auto scroll-thin pb-2">
      <div
        role="grid"
        aria-label="Contribution activity by day"
        aria-rowcount={rows.length}
        aria-colcount={columns.length}
        className="grid w-full min-w-[560px] auto-cols-fr grid-flow-col grid-rows-7 gap-[3px]"
      >
      {rows.map((row, ri) => (
        <div key={ri} role="row" aria-rowindex={ri + 1} className="contents">
          {row.map((cell, ci) => (
            <motion.div
              key={cell.key}
              role="gridcell"
              aria-colindex={ci + 1}
              data-cell-key={cell.key}
              tabIndex={focusedCell === null ? (ri === 0 && ci === 0 ? 0 : -1) : focusedCell === cell.key ? 0 : -1}
              aria-label={cell.label}
              style={{ gridRow: ri + 1, gridColumn: ci + 1 }}
              onPointerEnter={(event) => onHover(event.clientX, event.clientY, cell.label)}
              onPointerMove={(event) => onHover(event.clientX, event.clientY, cell.label)}
              onPointerLeave={onHoverEnd}
              onFocus={(event) => onFocusShowTooltip(event.currentTarget, cell.label)}
              onBlur={onHoverEnd}
              onKeyDown={(event) => {
                let nextCi = ci;
                let nextRi = ri;
                if (event.key === "ArrowLeft") nextCi -= 1;
                else if (event.key === "ArrowRight") nextCi += 1;
                else if (event.key === "ArrowUp") nextRi -= 1;
                else if (event.key === "ArrowDown") nextRi += 1;
                else return;
                if (nextCi < 0 || nextCi >= columns.length || nextRi < 0 || nextRi >= rows.length) return;
                const nextCell = columns[nextCi]?.[nextRi];
                if (!nextCell) return;
                event.preventDefault();
                onFocusCell(nextCell.key);
                window.requestAnimationFrame(() => {
                  document.querySelector<HTMLElement>(`[data-cell-key="${nextCell.key}"]`)?.focus();
                });
              }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.22,
                ease: [0.22, 1, 0.36, 1],
                delay: (ci * rows.length + ri) * 0.006,
              }}
              className={`aspect-square w-full cursor-pointer rounded-[2px] transition-[filter,box-shadow] hover:brightness-125 hover:ring-1 hover:ring-cyan/70 focus-visible:ring-1 focus-visible:ring-cyan ${CELL_STYLES[intensity(cell.count, max)]}`}
            />
          ))}
        </div>
      ))}
      </div>
    </div>
  );
}

// Weekly fallback: one datum per week, rendered as a single row of bars. No
// weekday is invented and no fake zero days are shown; the keyboard model is a
// single roving tab stop with left/right arrow movement across weeks.
function WeeklyBars({
  weeks,
  max,
  focusedKey,
  onFocusKey,
  onHover,
  onHoverEnd,
  onFocusShowTooltip,
}: {
  weeks: HeatmapCell[];
  max: number;
  focusedKey: string | null;
  onFocusKey: (key: string | null) => void;
  onHover: (x: number, y: number, label: string) => void;
  onHoverEnd: () => void;
  onFocusShowTooltip: (element: HTMLElement, label: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto scroll-thin pb-2">
      <div
        role="grid"
        aria-label="Weekly public commit activity"
        aria-rowcount={1}
        aria-colcount={weeks.length}
        className="min-w-[560px]"
      >
        <div role="row" className="flex h-16 items-end gap-[3px]">
          {weeks.map((cell, ci) => (
            <motion.div
              key={cell.key}
              role="gridcell"
              aria-colindex={ci + 1}
              data-cell-key={cell.key}
              tabIndex={focusedKey === null ? (ci === 0 ? 0 : -1) : focusedKey === cell.key ? 0 : -1}
              aria-label={cell.label}
              style={{ height: `${Math.max(6, max > 0 ? (cell.count / max) * 100 : 0)}%` }}
              onPointerEnter={(event) => onHover(event.clientX, event.clientY, cell.label)}
              onPointerMove={(event) => onHover(event.clientX, event.clientY, cell.label)}
              onPointerLeave={onHoverEnd}
              onFocus={(event) => onFocusShowTooltip(event.currentTarget, cell.label)}
              onBlur={onHoverEnd}
              onKeyDown={(event) => {
                let nextCi = ci;
                if (event.key === "ArrowLeft") nextCi -= 1;
                else if (event.key === "ArrowRight") nextCi += 1;
                else return;
                if (nextCi < 0 || nextCi >= weeks.length) return;
                const nextCell = weeks[nextCi];
                event.preventDefault();
                onFocusKey(nextCell.key);
                window.requestAnimationFrame(() => {
                  document.querySelector<HTMLElement>(`[data-cell-key="${nextCell.key}"]`)?.focus();
                });
              }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1], delay: ci * 0.004 }}
              className={`min-w-[9px] flex-1 cursor-pointer rounded-[2px] transition-[filter,box-shadow] hover:brightness-125 hover:ring-1 hover:ring-cyan/70 focus-visible:ring-1 focus-visible:ring-cyan ${CELL_STYLES[intensity(cell.count, max)]}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

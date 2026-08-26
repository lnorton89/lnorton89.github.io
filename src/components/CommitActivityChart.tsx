"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";
import type { WeeklyCommits, GithubSnapshot } from "@/lib/types";

function useElementWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

const HEIGHT = 120;
const PAD_Y = 8;

export default function CommitActivityChart({
  weekly,
  coverage,
  username,
  embedded = false,
}: {
  weekly: WeeklyCommits[];
  coverage?: GithubSnapshot["weeklyCommitsCoverage"];
  username?: string;
  embedded?: boolean;
}) {
  const [windowWeeks, setWindowWeeks] = useState(16);
  const visibleWeeks = weekly.slice(-windowWeeks);
  const totalRecent = visibleWeeks.reduce((s, w) => s + (w.commits ?? 0), 0);
  const complete = coverage?.complete ?? weekly.every((week) => week.commits !== null);
  const coveredRepos = coverage?.coveredRepos ?? 0;
  const eligibleRepos = coverage?.eligibleRepos ?? 0;
  const hasMeasuredRepos = complete || coveredRepos > 0 || !coverage;

  const { ref, width } = useElementWidth();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const max = Math.max(1, ...visibleWeeks.map((w) => w.commits ?? 0));
  const innerW = Math.max(0, width);
  const innerH = HEIGHT - PAD_Y * 2;
  const n = visibleWeeks.length;
  const step = n > 1 ? innerW / (n - 1) : 0;

  const points = visibleWeeks.map((w, i) => {
    const x = n > 1 ? i * step : 0;
    const y = innerH - ((w.commits ?? 0) / max) * innerH + PAD_Y;
    return { x, y, week: w, index: i };
  });

  const linePath = points.length
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
    : "";
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${HEIGHT} L ${points[0].x.toFixed(1)} ${HEIGHT} Z`
    : "";

  const active = activeIndex !== null ? points[activeIndex] : null;
  const attribution = username ? `attributed to @${username}` : "attributed to this account";
  const scope = "across tracked repositories";

  return (
    <div className={`h-full ${embedded ? "lg:border-l lg:border-hairline lg:pl-6" : "rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm"}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-sm font-semibold tracking-wide">Commit velocity</h3>
        <div className="flex items-center rounded border border-hairline p-0.5" aria-label="Commit velocity time window">
          {[4, 8, 16, 26, 52].map((weeks) => (
            <button
              key={weeks}
              type="button"
              onClick={() => {
                setWindowWeeks(weeks);
                setActiveIndex(null);
              }}
              aria-pressed={windowWeeks === weeks}
              className={`rounded px-1.5 py-1 font-mono text-[10px] transition-colors ${
                windowWeeks === weeks ? "bg-amber/15 text-amber" : "text-text-faint hover:text-text"
              }`}
            >
              {weeks}w
            </button>
          ))}
        </div>
      </div>

      {!hasMeasuredRepos ? (
        <p className="flex h-[120px] items-center justify-center text-center font-mono text-xs text-text-faint">
          Commit activity is unavailable because no tracked repository statistics could be measured.
        </p>
      ) : totalRecent === 0 ? (
        <p className="flex h-[120px] items-center justify-center text-center font-mono text-xs text-text-faint">
          No measured commits {attribution} in this window
          {!complete && eligibleRepos > 0 ? ` (${coveredRepos}/${eligibleRepos} repositories measured)` : ""}
        </p>
      ) : (
        <div ref={ref} className="relative h-[120px]">
          {width > 0 && (
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label={`Weekly commits ${attribution} ${scope} over the last ${windowWeeks} weeks${complete ? "" : `; partial coverage ${coveredRepos} of ${eligibleRepos} repositories`}`}
              tabIndex={0}
              className="block h-full w-full cursor-crosshair rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan"
              onFocus={() => setActiveIndex((current) => (current === null ? n - 1 : current))}
              onBlur={() => setActiveIndex(null)}
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const index = Math.max(0, Math.min(n - 1, step > 0 ? Math.round(x / step) : 0));
                setActiveIndex(index);
              }}
              onMouseLeave={(event) =>
                setActiveIndex((current) =>
                  document.activeElement === event.currentTarget ? current : null
                )
              }
              onKeyDown={(event) => {
                if (activeIndex === null) return;
                let next = activeIndex;
                if (event.key === "ArrowLeft") next -= 1;
                else if (event.key === "ArrowRight") next += 1;
                else return;
                if (next < 0 || next >= n) return;
                event.preventDefault();
                setActiveIndex(next);
              }}
            >
              <defs>
                <linearGradient id="commitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3ddad7" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#3ddad7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#commitFill)" />
              <path d={linePath} fill="none" stroke="#3ddad7" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {active && (
                <g>
                  <line x1={active.x} y1={PAD_Y - 2} x2={active.x} y2={HEIGHT - PAD_Y + 2} stroke="#3ddad7" strokeWidth={1} strokeOpacity={0.4} />
                  <circle cx={active.x} cy={active.y} r={3.5} fill="#3ddad7" />
                </g>
              )}
            </svg>
          )}
          {active && (
            <div
              className="pointer-events-none absolute -top-1 z-10 max-w-[min(220px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-full rounded-md border border-hairline bg-surface-raised px-2.5 py-1.5 text-center font-mono text-[11px] text-text shadow-lg"
              style={{ left: Math.max(56, Math.min(active.x, Math.max(56, width - 56))) }}
            >
              <div className="text-text-faint">Week of {active.week.weekStart}</div>
              <div className="text-cyan">{formatNumber(active.week.commits ?? 0)} known commits</div>
            </div>
          )}
          <span className="sr-only" aria-live="polite">
            {active ? `${formatNumber(active.week.commits ?? 0)} known commits in the week of ${active.week.weekStart}` : ""}
          </span>
        </div>
      )}

      {hasMeasuredRepos && (
        <div className="mt-3 space-y-1 font-mono text-xs text-text-muted">
          <p>
            {formatNumber(totalRecent)} {complete ? "commits" : "known commits"} {attribution} in last {windowWeeks} weeks
          </p>
          <p className="text-[10px] leading-relaxed text-text-faint">
            {complete
              ? `GitHub contributor statistics across all ${eligibleRepos || "tracked"} tracked repositories.`
              : `${coveredRepos}/${eligibleRepos} tracked repositories measured; totals may be understated${coverage?.pendingRepos ? ` · ${coverage.pendingRepos} pending` : ""}${coverage?.failedRepos ? ` · ${coverage.failedRepos} failed` : ""}.`}
          </p>
        </div>
      )}
    </div>
  );
}

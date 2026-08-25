"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useState } from "react";
import type { WeeklyCommits } from "@/lib/types";

export default function CommitActivityChart({ weekly, embedded = false }: { weekly: WeeklyCommits[]; embedded?: boolean }) {
  const [windowWeeks, setWindowWeeks] = useState(16);
  const visibleWeeks = weekly.slice(-windowWeeks);
  const totalRecent = visibleWeeks.reduce((s, w) => s + w.commits, 0);

  return (
    <div className={`h-full ${embedded ? "lg:border-l lg:border-hairline lg:pl-6" : "rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm"}`}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-sm font-semibold tracking-wide">
          Commit velocity
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="font-mono text-xs text-text-muted">{totalRecent} in last {windowWeeks} weeks</span>
          <div className="flex items-center rounded border border-hairline p-0.5" aria-label="Commit velocity time window">
            {[4, 8, 16, 26, 52].map((weeks) => (
              <button
                key={weeks}
                type="button"
                onClick={() => setWindowWeeks(weeks)}
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
      </div>
      {totalRecent === 0 ? (
        <p className="flex h-[120px] items-center justify-center text-center font-mono text-xs text-text-faint">
          No public push activity available for this window
        </p>
      ) : (
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visibleWeeks} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="commitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3ddad7" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#3ddad7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="weekStart" hide />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-hairline bg-surface-raised px-3 py-2 font-mono text-xs shadow-lg">
                    <div className="mb-1 text-text-faint">Week of {String(label)}</div>
                    <div className="text-cyan">{String(payload[0].value)} commits</div>
                  </div>
                );
              }}
              contentStyle={{
                background: "#191c21",
                border: "1px solid #24272e",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
              labelFormatter={(v) => `week of ${v}`}
            />
            <Area
              type="monotone"
              dataKey="commits"
              stroke="#3ddad7"
              strokeWidth={2}
              fill="url(#commitFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}

"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import type { WeeklyCommits } from "@/lib/types";

export default function CommitActivityChart({ weekly }: { weekly: WeeklyCommits[] }) {
  const recent = weekly.slice(-16);
  const totalRecent = recent.reduce((s, w) => s + w.commits, 0);

  return (
    <div className="rounded-lg border border-hairline bg-surface/80 backdrop-blur-sm p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide uppercase">
          <TrendingUp className="h-4 w-4 text-amber" aria-hidden="true" />
          Commit velocity
        </h3>
        <span className="font-mono text-xs text-text-muted">{totalRecent} in last 16 weeks</span>
      </div>
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={recent} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="commitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3ddad7" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#3ddad7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="weekStart" hide />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "#191c21",
                border: "1px solid #24272e",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
              labelFormatter={(v) => `week of ${v}`}
              formatter={(value) => [`${value} commits`, ""]}
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
    </div>
  );
}

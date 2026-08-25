"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Code2 } from "lucide-react";
import { languageColor } from "@/lib/format";

export default function LanguageBreakdown({
  languageTotals,
}: {
  languageTotals: Record<string, number>;
}) {
  const entries = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const data = entries.map(([name, bytes]) => ({
    name,
    value: bytes,
    pct: total > 0 ? ((bytes / total) * 100).toFixed(1) : "0",
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-surface/80 p-5">
        <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold tracking-wide uppercase">
          <Code2 className="h-4 w-4 text-cyan" aria-hidden="true" />
          Languages
        </h3>
        <p className="text-sm text-text-faint font-mono">no language data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hairline bg-surface/80 backdrop-blur-sm p-5">
      <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold tracking-wide uppercase">
        <Code2 className="h-4 w-4 text-cyan" aria-hidden="true" />
        Languages in play
      </h3>
      <div className="flex items-center gap-4">
        <div className="h-[150px] w-[150px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={44}
                outerRadius={68}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={languageColor(d.name)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#191c21",
                  border: "1px solid #24272e",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
                labelStyle={{ color: "#e8e6e1" }}
                formatter={(value, name) => [
                  `${((Number(value) / total) * 100).toFixed(1)}%`,
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-1.5 min-w-0">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: languageColor(d.name) }}
              />
              <span className="text-text truncate">{d.name}</span>
              <span className="ml-auto font-mono text-text-faint shrink-0">{d.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Code2 } from "lucide-react";
import { languageColor } from "@/lib/format";
import { useLiveDataStore } from "@/store/live-data-store";

export default function LanguageBreakdown({
  languageTotals,
}: {
  languageTotals: Record<string, number>;
}) {
  const selectedLanguage = useLiveDataStore((s) => s.selectedLanguage);
  const setSelectedLanguage = useLiveDataStore((s) => s.setSelectedLanguage);
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
      <div className="h-full rounded-lg border border-hairline bg-surface/80 p-5">
        <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold tracking-wide">
          <Code2 className="h-4 w-4 text-cyan" aria-hidden="true" />
          Languages
        </h3>
        <p className="text-sm text-text-faint font-mono">No language data available</p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg border border-hairline bg-surface/80 backdrop-blur-sm p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide">
          <Code2 className="h-4 w-4 text-cyan" aria-hidden="true" />
          Languages in play
        </h3>
        {selectedLanguage && (
          <button
            type="button"
            onClick={() => setSelectedLanguage(null)}
            className="rounded border border-cyan/30 bg-cyan/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-cyan transition-colors hover:bg-cyan/20"
          >
            clear {selectedLanguage}
          </button>
        )}
      </div>
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
                  <Cell
                    key={d.name}
                    fill={languageColor(d.name)}
                    opacity={selectedLanguage && selectedLanguage !== d.name ? 0.25 : 1}
                    onClick={() => setSelectedLanguage(selectedLanguage === d.name ? null : d.name)}
                    cursor="pointer"
                  />
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
            <li key={d.name}>
              <button
                type="button"
                onClick={() => setSelectedLanguage(selectedLanguage === d.name ? null : d.name)}
                aria-pressed={selectedLanguage === d.name}
                className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs transition-colors hover:bg-surface-raised ${
                  selectedLanguage && selectedLanguage !== d.name ? "opacity-45" : ""
                } ${selectedLanguage === d.name ? "bg-surface-raised" : ""}`}
              >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: languageColor(d.name) }}
              />
              <span className="text-text truncate">{d.name}</span>
              <span className="ml-auto font-mono text-text-faint shrink-0">{d.pct}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
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
  const allEntries = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
  const entries = allEntries.slice(0, 12);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const data = entries.map(([name, bytes]) => ({
    name,
    value: bytes,
    pct: total > 0 ? ((bytes / total) * 100).toFixed(1) : "0",
  }));

  return (
    <section>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
          <Code2 className="h-4 w-4 text-cyan" aria-hidden="true" />
          Languages in play
        </h2>
        <p className="mt-1 font-mono text-[11px] text-text-faint">
          the technologies behind the repositories
        </p>
      </div>
      <div className="rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm">
        {data.length === 0 ? (
          <p className="text-sm font-mono text-text-faint">No language data available</p>
        ) : (
          <>
            <div className="mb-4 flex justify-end">
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
              <motion.div
                initial={{ opacity: 0, scale: 0.75, rotate: -12 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
                className="h-[150px] w-[150px] shrink-0"
              >
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
              </motion.div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {data.map((d, index) => (
                  <motion.li
                    key={d.name}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage(selectedLanguage === d.name ? null : d.name)}
                      aria-pressed={selectedLanguage === d.name}
                      className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs transition-colors hover:bg-surface-raised ${
                        selectedLanguage && selectedLanguage !== d.name ? "opacity-45" : ""
                      } ${selectedLanguage === d.name ? "bg-surface-raised" : ""}`}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: languageColor(d.name) }} />
                      <span className="truncate text-text">{d.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-text-faint">{d.pct}%</span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </div>
            <p className="mt-4 border-t border-hairline/60 pt-3 font-mono text-[11px] text-text-faint">
              showing {entries.length} of {allEntries.length} languages · {total.toLocaleString()} bytes represented
            </p>
          </>
        )}
      </div>
    </section>
  );
}

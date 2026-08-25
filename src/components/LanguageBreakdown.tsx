"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Code2, Files, ListTree } from "lucide-react";
import type { IconType } from "react-icons";
import {
  SiC,
  SiCmake,
  SiCplusplus,
  SiSharp,
  SiCss,
  SiGo,
  SiGnubash,
  SiHtml5,
  SiJavascript,
  SiNixos,
  SiPowers,
  SiPython,
  SiRust,
  SiTypescript,
} from "react-icons/si";
import { languageColor } from "@/lib/format";
import { useLiveDataStore } from "@/store/live-data-store";
import type { RepoSummary } from "@/lib/types";

const LANGUAGE_ICONS: Record<string, IconType> = {
  C: SiC,
  CMake: SiCmake,
  "C++": SiCplusplus,
  "C#": SiSharp,
  CSS: SiCss,
  Go: SiGo,
  Shell: SiGnubash,
  HTML: SiHtml5,
  JavaScript: SiJavascript,
  Nix: SiNixos,
  PowerShell: SiPowers,
  Python: SiPython,
  Rust: SiRust,
  TypeScript: SiTypescript,
};

export default function LanguageBreakdown({
  languageTotals,
  repos,
}: {
  languageTotals: Record<string, number>;
  repos: RepoSummary[];
}) {
  const selectedLanguage = useLiveDataStore((s) => s.selectedLanguage);
  const setSelectedLanguage = useLiveDataStore((s) => s.setSelectedLanguage);
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null);
  const allEntries = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
  const entries = allEntries;
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const data = entries.map(([name, bytes]) => ({
    name,
    value: bytes,
    pct: total > 0 ? ((bytes / total) * 100).toFixed(1) : "0",
    pctValue: total > 0 ? (bytes / total) * 100 : 0,
    chartValue: total > 0 ? Math.max((bytes / total) * 100, 0.35) : 0,
    filesEstimate: Math.max(1, Math.round(bytes / 4000)),
  }));
  const languageRepos = (language: string) =>
    repos
      .map((repo) => ({ repo, bytes: repo.languages?.[language] ?? 0 }))
      .filter(({ bytes }) => bytes > 0)
      .sort((a, b) => b.bytes - a.bytes);

  return (
    <section className="flex h-full flex-col">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
          <Code2 className="h-4 w-4 text-cyan" aria-hidden="true" />
          Languages in play
        </h2>
        <p className="mt-1 font-mono text-[11px] text-text-faint">
          the technologies behind the repositories
        </p>
      </div>
      <div className="flex-1 rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm">
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
            <div className="mb-1 grid grid-cols-[auto_minmax(0,1fr)_3rem_4rem_minmax(120px,1.5fr)] items-center gap-2 px-1 font-mono text-[9px] uppercase tracking-wide text-text-faint">
              <span />
              <span>language</span>
              <span className="text-right">share</span>
              <span className="text-right">files</span>
              <span />
            </div>
            <ul className="space-y-1.5">
                {data.map((d, index) => (
                  <motion.li
                    key={d.name}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                    onMouseEnter={() => setHoveredLanguage(d.name)}
                    onMouseLeave={() => setHoveredLanguage(null)}
                    onFocus={() => setHoveredLanguage(d.name)}
                    onBlur={() => setHoveredLanguage(null)}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage(selectedLanguage === d.name ? null : d.name)}
                      aria-pressed={selectedLanguage === d.name}
                      className={`grid w-full grid-cols-[auto_minmax(0,1fr)_3rem_4rem_minmax(120px,1.5fr)] items-center gap-2 rounded px-1 py-1 text-left text-xs transition-colors hover:bg-surface-raised ${
                        selectedLanguage && selectedLanguage !== d.name ? "opacity-45" : ""
                      } ${selectedLanguage === d.name ? "bg-surface-raised" : ""}`}
                    >
                      {(() => {
                        const LanguageIcon = LANGUAGE_ICONS[d.name] ?? Code2;
                        return <LanguageIcon className="h-3.5 w-3.5 shrink-0" style={{ color: languageColor(d.name) }} aria-hidden="true" />;
                      })()}
                      <span className="truncate text-text">{d.name}</span>
                      <span className="shrink-0 text-right font-mono text-text-faint">{d.pct}%</span>
                      <span className="shrink-0 text-right font-mono text-text-faint">{d.filesEstimate.toLocaleString()}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-surface-raised" aria-hidden="true">
                        <span
                          className="block h-full rounded-full transition-[width,background-color,opacity]"
                          style={{
                            width: `${Math.max(d.chartValue, 1)}%`,
                            backgroundColor: languageColor(d.name),
                            opacity: selectedLanguage && selectedLanguage !== d.name ? 0.25 : 1,
                          }}
                        />
                      </span>
                    </button>
                    {hoveredLanguage === d.name && (
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-hairline bg-surface-raised px-3 py-2.5 font-mono text-[10px] text-text shadow-xl"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-text-muted">
                          <span>{languageRepos(d.name).length} repositories</span>
                          <span>{d.value.toLocaleString()} bytes</span>
                        </div>
                        <div className="mb-1.5 text-[9px] text-text-faint">estimated lines and files from byte totals</div>
                        <div className="space-y-1">
                          {languageRepos(d.name).slice(0, 4).map(({ repo, bytes }) => (
                            <div key={repo.fullName} className="min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <span className="flex min-w-0 items-center gap-1.5 truncate">
                                  {(() => {
                                    const LanguageIcon = LANGUAGE_ICONS[d.name] ?? Code2;
                                    return <LanguageIcon className="h-3 w-3 shrink-0" style={{ color: languageColor(d.name) }} aria-hidden="true" />;
                                  })()}
                                  <span className="truncate">{repo.name}</span>
                                </span>
                                <span className="shrink-0 text-text-faint">
                                  {((bytes / d.value) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-text-faint">
                                <span className="inline-flex items-center gap-1"><ListTree className="h-2.5 w-2.5" aria-hidden="true" />~{Math.max(1, Math.round(bytes / 45)).toLocaleString()} lines</span>
                                <span className="inline-flex items-center gap-1"><Files className="h-2.5 w-2.5" aria-hidden="true" />~{Math.max(1, Math.round(bytes / 4000)).toLocaleString()} files</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.li>
                ))}
            </ul>
            <p className="mt-4 border-t border-hairline/60 pt-3 font-mono text-[11px] text-text-faint">
              showing {entries.length} of {allEntries.length} languages · {total.toLocaleString()} bytes represented
            </p>
          </>
        )}
      </div>
    </section>
  );
}

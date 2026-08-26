"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Code2, Files } from "lucide-react";
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
import { languageColor, formatNumber } from "@/lib/format";
import { computeLanguageMetrics } from "@/lib/language-metrics";
import { revealRepositorySection } from "@/lib/reveal-repositories";
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

type Metric = "repos" | "bytes";

const TOOLTIP_MAX_REPOS = 8;

// Files are counted from recognized repository-tree extensions; a truncated
// tree is incomplete, so a per-language total is only shown when every repo
// containing that language has complete tree data.
function languageFileTotal(repos: RepoSummary[], language: string): number | null {
  let total = 0;
  let complete = true;
  for (const repo of repos) {
    const bytes = repo.languages?.[language] ?? 0;
    if (bytes <= 0) continue;
    total += repo.languageFiles?.[language] ?? 0;
    if (repo.languageFilesComplete === false) complete = false;
  }
  return complete && total > 0 ? total : null;
}

export default function LanguageBreakdown({
  repos,
}: {
  repos: RepoSummary[];
}) {
  const selectedLanguage = useLiveDataStore((s) => s.selectedLanguage);
  const setSelectedLanguage = useLiveDataStore((s) => s.setSelectedLanguage);
  const [metric, setMetric] = useState<Metric>("repos");
  const [hoveredLanguage, setHoveredLanguage] = useState<{ name: string; x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(null);

  const { metrics, repoCount, totalBytes } = useMemo(() => computeLanguageMetrics(repos), [repos]);

  const sorted = useMemo(() => {
    const arr = [...metrics];
    if (metric === "bytes") arr.sort((a, b) => b.bytes - a.bytes);
    else arr.sort((a, b) => b.prevalence - a.prevalence);
    return arr;
  }, [metrics, metric]);

  // Measure the rendered tooltip once per language so positioning uses real
  // dimensions instead of a fixed-height assumption.
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    setTooltipSize({ width: el.offsetWidth, height: el.offsetHeight });
  }, [hoveredLanguage?.name]);

  const positionTooltip = (name: string, x: number, y: number) => {
    const width = tooltipSize?.width ?? 288;
    const height = tooltipSize?.height ?? 320;
    setHoveredLanguage({
      name,
      x: Math.max(12, Math.min(x + 14, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(y + 14, window.innerHeight - height - 12)),
    });
  };

  const hoveredData = hoveredLanguage ? sorted.find((d) => d.name === hoveredLanguage.name) : null;
  const languageRepos = (language: string) =>
    repos
      .map((repo) => ({ repo, bytes: repo.languages?.[language] ?? 0 }))
      .filter(({ bytes }) => bytes > 0)
      .sort((a, b) => b.bytes - a.bytes);

  const toggleLanguage = (name: string) => {
    const next = selectedLanguage === name ? null : name;
    setSelectedLanguage(next);
    if (next) revealRepositorySection();
  };

  const data = sorted.map((d) => {
    const pctBase = metric === "bytes" ? totalBytes : repoCount;
    const value = metric === "bytes" ? d.bytes : d.prevalence;
    const pctValue = pctBase > 0 ? (value / pctBase) * 100 : 0;
    return {
      name: d.name,
      bytes: d.bytes,
      prevalence: d.prevalence,
      pct: pctValue.toFixed(1),
      chartValue: Math.max(pctValue, 0.35),
    };
  });

  return (
    <section className="flex h-full flex-col">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
          <Code2 className="h-4 w-4 text-cyan" aria-hidden="true" />
          Languages in play
        </h2>
        <p className="mt-1 font-mono text-[11px] text-text-faint">
          the technologies behind the tracked repositories
        </p>
      </div>
      <div className="flex-1 rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm">
        {data.length === 0 ? (
          <p className="text-sm font-mono text-text-faint">No language data available</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center rounded border border-hairline p-0.5" aria-label="Language ranking metric">
                {(["repos", "bytes"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={metric === value}
                    onClick={() => setMetric(value)}
                    className={`rounded px-2 py-1 font-mono text-[10px] transition-colors ${
                      metric === value ? "bg-cyan/15 text-cyan" : "text-text-faint hover:text-text"
                    }`}
                  >
                    {value === "repos" ? "by prevalence" : "by bytes"}
                  </button>
                ))}
              </div>
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
            <div className="mb-1 hidden grid-cols-[auto_minmax(0,1fr)_3rem_4rem_minmax(120px,1.5fr)] items-center gap-2 px-1 font-mono text-[9px] uppercase tracking-wide text-text-faint sm:grid">
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
                    onMouseEnter={(event) => positionTooltip(d.name, event.clientX, event.clientY)}
                    onMouseMove={(event) => positionTooltip(d.name, event.clientX, event.clientY)}
                    onMouseLeave={() => setHoveredLanguage(null)}
                    onFocus={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      positionTooltip(d.name, rect.right, rect.top);
                    }}
                    onBlur={() => setHoveredLanguage(null)}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() => toggleLanguage(d.name)}
                      aria-pressed={selectedLanguage === d.name}
                      className={`grid w-full grid-cols-[auto_minmax(0,1fr)_3rem] items-center gap-2 rounded px-1 py-1 text-left text-xs transition-colors hover:bg-surface-raised sm:grid-cols-[auto_minmax(0,1fr)_3rem_4rem_minmax(120px,1.5fr)] ${
                        selectedLanguage && selectedLanguage !== d.name ? "opacity-45" : ""
                      } ${selectedLanguage === d.name ? "bg-surface-raised" : ""}`}
                    >
                      {(() => {
                        const LanguageIcon = LANGUAGE_ICONS[d.name] ?? Code2;
                        return <LanguageIcon className="h-3.5 w-3.5 shrink-0" style={{ color: languageColor(d.name) }} aria-hidden="true" />;
                      })()}
                      <span className="truncate text-text">{d.name}</span>
                      <span className="shrink-0 text-right font-mono text-text-faint">{d.pct}%</span>
                      <span className="hidden shrink-0 text-right font-mono text-text-faint sm:block">
                        {(() => {
                          const fileCount = languageFileTotal(repos, d.name);
                          return fileCount ? formatNumber(fileCount) : "—";
                        })()}
                      </span>
                      <span className="col-start-2 col-span-2 h-2 overflow-hidden rounded-full bg-surface-raised sm:col-auto" aria-hidden="true">
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
                  </motion.li>
                ))}
            </ul>
            {hoveredLanguage && hoveredData && typeof document !== "undefined" && (() => {
              const repoList = languageRepos(hoveredData.name);
              const shown = repoList.slice(0, TOOLTIP_MAX_REPOS);
              const remaining = repoList.length - shown.length;
              return createPortal(
                <div
                  ref={tooltipRef}
                  role="tooltip"
                  className="pointer-events-none fixed z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-md border border-hairline bg-surface-raised px-3 py-2.5 font-mono text-[10px] text-text shadow-xl"
                  style={{ left: hoveredLanguage.x, top: hoveredLanguage.y }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-text-muted">
                    <span>{repoList.length} repositories</span>
                    <span>{formatNumber(hoveredData.bytes)} bytes</span>
                  </div>
                  <div className="mb-1.5 text-[9px] text-text-faint">files are counted from recognized repository-tree extensions</div>
                  <div className="space-y-1">
                    {shown.map(({ repo, bytes }) => (
                      <div key={repo.fullName} className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-1.5 truncate">
                            {(() => {
                              const LanguageIcon = LANGUAGE_ICONS[hoveredData.name] ?? Code2;
                              return <LanguageIcon className="h-3 w-3 shrink-0" style={{ color: languageColor(hoveredData.name) }} aria-hidden="true" />;
                            })()}
                            <span className="truncate">{repo.name}</span>
                          </span>
                          <span className="shrink-0 text-text-faint">{((bytes / hoveredData.bytes) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-text-faint">
                          <span className="inline-flex items-center gap-1"><Files className="h-2.5 w-2.5" aria-hidden="true" />{repo.languageFiles?.[hoveredData.name] && repo.languageFilesComplete !== false ? `${formatNumber(repo.languageFiles[hoveredData.name])} files` : "files —"}</span>
                        </div>
                      </div>
                    ))}
                    {remaining > 0 && (
                      <div className="pt-1 text-[9px] text-text-faint">+{remaining} more</div>
                    )}
                  </div>
                </div>,
                document.body
              );
            })()}
            <p className="mt-4 border-t border-hairline/60 pt-3 font-mono text-[11px] text-text-faint">
              showing {data.length} languages · ranked by {metric === "bytes" ? "raw bytes" : `prevalence across ${formatNumber(repoCount)} repositories`}
              {metric === "bytes" && ` · ${formatNumber(totalBytes)} bytes`}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

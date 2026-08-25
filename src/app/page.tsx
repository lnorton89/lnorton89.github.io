import fs from "node:fs";
import path from "node:path";
import Hero from "@/components/Hero";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import CommitActivityChart from "@/components/CommitActivityChart";
import RepoGrid from "@/components/RepoGrid";
import type { GithubSnapshot } from "@/lib/types";

function loadSnapshot(): GithubSnapshot | null {
  const file = path.join(process.cwd(), "public", "data", "github.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export default function Home() {
  const data = loadSnapshot();

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center font-mono text-sm text-text-muted">
          <p className="text-amber mb-2">no data snapshot found</p>
          <p>
            Run <code className="text-cyan">npm run fetch:data</code> (with{" "}
            <code className="text-cyan">GH_USERNAME</code> set) before{" "}
            <code className="text-cyan">next build</code> or <code className="text-cyan">next dev</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6">
        <Hero data={data} />

        <section className="pb-10">
          <ContributionHeatmap
            contributions={data.contributions}
            weeklyFallback={data.weeklyCommits}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4 pb-14">
          <LanguageBreakdown languageTotals={data.languageTotals} />
          <CommitActivityChart weekly={data.weeklyCommits} />
        </section>

        <section className="pb-20">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-sm font-semibold tracking-wide uppercase text-text">
              Recently active repositories
            </h2>
            <a
              href={`${data.profile.htmlUrl}?tab=repositories`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-text-faint hover:text-cyan transition-colors"
            >
              view all →
            </a>
          </div>
          <RepoGrid base={data} />
        </section>

        <footer className="pb-16 pt-8 border-t border-hairline flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-text-faint">
          <span>
            snapshot generated {new Date(data.generatedAt).toUTCString()}
          </span>
          <span>
            built with Next.js, framer-motion, recharts &amp; the GitHub API
          </span>
        </footer>
      </div>
    </main>
  );
}

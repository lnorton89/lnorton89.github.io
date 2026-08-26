import fs from "node:fs";
import path from "node:path";
import Hero from "@/components/Hero";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import CommitActivityChart from "@/components/CommitActivityChart";
import RepositorySignals from "@/components/RepositorySignals";
import ProjectTimeline from "@/components/ProjectTimeline";
import RepoGrid from "@/components/RepoGrid";
import PinnedRepos from "@/components/PinnedRepos";
import SectionReveal from "@/components/SectionReveal";
import LiveUpdateFeedback from "@/components/LiveUpdateFeedback";
import SnapshotStatus from "@/components/SnapshotStatus";
import { Activity, FolderGit2 } from "lucide-react";
import { getSiteConfig } from "@/lib/site";
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

  // The structured data describes THIS website, not the GitHub profile. The
  // GitHub profile belongs in sameAs.
  const { rootUrl } = getSiteConfig();
  const profilePageId = `${rootUrl}#profile-page`;
  const personId = `${rootUrl}#person`;
  const blog = data.profile.blog?.trim();
  const blogUrl = blog
    ? (blog.startsWith("http://") || blog.startsWith("https://") ? blog : `https://${blog}`)
    : null;
  const sameAs = [data.profile.htmlUrl, ...(blogUrl && blogUrl !== rootUrl ? [blogUrl] : [])];

  return (
    <main className="min-h-screen">
      <LiveUpdateFeedback />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "ProfilePage",
                "@id": profilePageId,
                url: rootUrl,
                mainEntity: { "@id": personId },
              },
              {
                "@type": "Person",
                "@id": personId,
                name: data.profile.name || data.profile.login,
                alternateName: `@${data.profile.login}`,
                url: rootUrl,
                image: data.profile.avatarUrl,
                description: data.profile.bio || undefined,
                sameAs,
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-6xl px-6">
        <Hero data={data} />

        <SectionReveal className="pb-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
                <Activity className="h-4 w-4 text-amber" aria-hidden="true" />
                Activity overview
              </h2>
              <p className="mt-1 font-mono text-[11px] text-text-faint">
                contributions and commit velocity, side by side
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-hairline bg-surface/80 p-5 backdrop-blur-sm">
            <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
            <ContributionHeatmap
              contributions={data.contributions}
              weeklyFallback={data.weeklyCommits}
              embedded
            />
            <CommitActivityChart weekly={data.weeklyCommits} coverage={data.weeklyCommitsCoverage} username={data.profile.login} embedded />
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="grid items-stretch gap-8 pb-14 lg:grid-cols-2">
          <PinnedRepos repos={data.pinnedRepos} allRepos={data.topRepos} />
          <LanguageBreakdown repos={data.topRepos} />
        </SectionReveal>

        <SectionReveal className="pb-14">
          <RepositorySignals repos={data.topRepos} />
        </SectionReveal>

        <SectionReveal className="pb-14">
          <ProjectTimeline repos={data.topRepos} />
        </SectionReveal>

        <SectionReveal className="pb-20">
          <div id="repositories" tabIndex={-1} className="scroll-mt-6 flex items-baseline justify-between mb-4 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-text">
              <FolderGit2 className="h-4 w-4 text-cyan" aria-hidden="true" />
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
        </SectionReveal>

        <footer className="pb-16 pt-8 border-t border-hairline flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-text-faint">
          <SnapshotStatus snapshot={data} />
          <span>
            built with Next.js, framer-motion &amp; the GitHub API
          </span>
        </footer>
      </div>
    </main>
  );
}

"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import { MapPin, Building2, Link as LinkIcon, FolderGit2, Users, Activity, CalendarDays } from "lucide-react";
import TerminalFeed from "@/components/TerminalFeed";
import LiveSync from "@/components/LiveSync";
import { compactNumber } from "@/lib/format";
import type { GithubSnapshot } from "@/lib/types";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};

export default function Hero({ data }: { data: GithubSnapshot }) {
  const { profile, contributions } = data;
  const stats = [
    { label: "Public repositories", value: profile.publicRepos, icon: FolderGit2 },
    { label: "Followers", value: profile.followers, icon: Users },
    { label: "Following", value: profile.following, icon: Users },
    ...(contributions
      ? [
          { label: "Contributions / year", value: contributions.contributionCalendar.totalContributions, icon: Activity },
          {
            label: "Contributions / month",
            value: Math.round(contributions.contributionCalendar.totalContributions / 12),
            icon: Activity,
          },
        ]
      : []),
  ];

  return (
    <section className="flex flex-col gap-8 pt-16 pb-16 lg:pt-20">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid min-w-0 items-end gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12"
      >
        <div className="min-w-0">
        <motion.div variants={item} className="flex items-center gap-3 mb-6">
          <Image
            src={profile.avatarUrl}
            alt={profile.login}
            width={44}
            height={44}
            loading="eager"
            className="rounded-full border border-hairline"
            unoptimized
          />
          <span className="font-mono text-sm text-text-muted">@{profile.login}</span>
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan" />
          </span>
          <span className="font-mono text-[11px] text-cyan/80 uppercase tracking-wide">
            Building now
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[0.98] tracking-tight text-text"
        >
          {profile.name || profile.login}
          <span className="text-amber">.</span>
        </motion.h1>

        {profile.bio && (
          <motion.p variants={item} className="mt-5 text-lg text-text-muted max-w-[46ch] leading-relaxed">
            {profile.bio}
          </motion.p>
        )}

        <motion.div variants={item} className="mt-5 flex flex-wrap items-center gap-4 text-sm text-text-faint">
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </span>
          )}
          {profile.company && (
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> {profile.company}
            </span>
          )}
          {profile.blog && (
            <a
              href={profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-cyan transition-colors"
            >
              <LinkIcon className="h-3.5 w-3.5" /> {profile.blog.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Since {new Date(profile.createdAt).getUTCFullYear()}
          </span>
        </motion.div>
        </div>

        <div className="flex min-w-0 flex-col gap-7 lg:pb-1">
          <motion.div variants={item} className="grid grid-cols-2 gap-x-4 gap-y-4 border-y border-hairline/70 py-4 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-text-faint">
                  <s.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-mono text-[10px] leading-tight tracking-wide text-text-faint">{s.label}</span>
                </div>
                <div className="font-display text-3xl font-semibold text-text tabular-nums">
                  {compactNumber(s.value)}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={item} className="flex items-center gap-3">
            <LiveSync base={data} />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="min-w-0 w-full"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: EASE_OUT }}
      >
        <TerminalFeed base={data} />
      </motion.div>
    </section>
  );
}

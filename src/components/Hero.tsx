"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import { MapPin, Building2, Link as LinkIcon, FolderGit2, Users, Activity } from "lucide-react";
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
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export default function Hero({ data }: { data: GithubSnapshot }) {
  const { profile, contributions } = data;
  const stats = [
    { label: "public repos", value: profile.publicRepos, icon: FolderGit2 },
    { label: "followers", value: profile.followers, icon: Users },
    ...(contributions
      ? [{ label: "contributions / yr", value: contributions.contributionCalendar.totalContributions, icon: Activity }]
      : []),
  ];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start pt-20 pb-16">
      <motion.div variants={stagger} initial="hidden" animate="show" className="min-w-0">
        <motion.div variants={item} className="flex items-center gap-3 mb-6">
          <Image
            src={profile.avatarUrl}
            alt={profile.login}
            width={44}
            height={44}
            className="rounded-full border border-hairline"
            unoptimized
          />
          <span className="font-mono text-sm text-text-muted">@{profile.login}</span>
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan" />
          </span>
          <span className="font-mono text-[11px] text-cyan/80 uppercase tracking-wide">
            building now
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
        </motion.div>

        <motion.div variants={item} className="mt-8 flex flex-wrap gap-8">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="mb-1 flex items-center gap-2 text-text-faint">
                <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-mono text-[11px] uppercase tracking-wide">{s.label}</span>
              </div>
              <div className="font-display text-3xl font-semibold text-text tabular-nums">
                {compactNumber(s.value)}
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div variants={item} className="mt-8">
          <LiveSync base={data} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: EASE_OUT }}
      >
        <TerminalFeed base={data} />
      </motion.div>
    </section>
  );
}

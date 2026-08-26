"use client";

import type { GithubSnapshot } from "@/lib/types";
import { useLiveDataStore } from "@/store/live-data-store";

function formatTimestamp(value: string) {
  return new Date(value).toUTCString();
}

export default function SnapshotStatus({ snapshot }: { snapshot: GithubSnapshot }) {
  const lastSyncedAt = useLiveDataStore((state) => state.lastSyncedAt);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span>snapshot generated {formatTimestamp(snapshot.generatedAt)}</span>
      {lastSyncedAt && <span className="text-cyan/80">API refreshed {formatTimestamp(lastSyncedAt)}</span>}
    </div>
  );
}

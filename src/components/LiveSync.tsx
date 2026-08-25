"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, RefreshCw } from "lucide-react";
import { fetchLiveSnapshot } from "@/lib/fetch-live";
import { useLiveDataStore } from "@/store/live-data-store";
import { relativeTime } from "@/lib/format";
import type { GithubSnapshot } from "@/lib/types";

export default function LiveSync({ base }: { base: GithubSnapshot }) {
  const setLiveSnapshot = useLiveDataStore((s) => s.setLiveSnapshot);
  const lastSyncedAt = useLiveDataStore((s) => s.lastSyncedAt);
  const updateVersion = useLiveDataStore((s) => s.updateVersion);

  const { refetch, isFetching, isError } = useQuery({
    queryKey: ["live-github-snapshot", base.profile.login],
    queryFn: async () => {
      const snapshot = await fetchLiveSnapshot(base.profile.login, base);
      setLiveSnapshot(snapshot);
      return snapshot;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-text-faint">
      <button
        onClick={() => {
          void refetch();
        }}
        disabled={isFetching}
        className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface-raised px-3 py-1.5 text-text-muted hover:text-cyan hover:border-cyan/50 transition-colors disabled:opacity-50"
      >
        {updateVersion > 0 && !isFetching ? (
          <Check className="h-3 w-3 text-cyan" aria-hidden="true" />
        ) : (
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
        )}
        {isFetching ? "Syncing" : updateVersion > 0 ? "Updated" : "Sync now"}
      </button>
      <span>
        {isError
          ? "Sync failed — try again later"
          : lastSyncedAt
            ? `${updateVersion > 0 ? "live update" : "synced"} ${relativeTime(lastSyncedAt)}`
            : `Snapshot built ${relativeTime(base.generatedAt)}`}
      </span>
    </div>
  );
}

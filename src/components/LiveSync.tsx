"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchLiveSnapshot } from "@/lib/fetch-live";
import { useLiveDataStore } from "@/store/live-data-store";
import { relativeTime } from "@/lib/format";
import type { GithubSnapshot } from "@/lib/types";

export default function LiveSync({ base }: { base: GithubSnapshot }) {
  const [enabled, setEnabled] = useState(false);
  const setLiveSnapshot = useLiveDataStore((s) => s.setLiveSnapshot);
  const lastSyncedAt = useLiveDataStore((s) => s.lastSyncedAt);

  const { refetch, isFetching, isError } = useQuery({
    queryKey: ["live-github-snapshot", base.profile.login],
    queryFn: () => fetchLiveSnapshot(base.profile.login, base),
    enabled,
    staleTime: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    refetch().then((res) => {
      if (res.data) setLiveSnapshot(res.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-text-faint">
      <button
        onClick={() => {
          setEnabled(true);
          refetch().then((res) => {
            if (res.data) setLiveSnapshot(res.data);
          });
        }}
        disabled={isFetching}
        className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface-raised px-3 py-1.5 text-text-muted hover:text-cyan hover:border-cyan/50 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
        {isFetching ? "syncing" : "sync now"}
      </button>
      <span>
        {isError
          ? "sync failed — rate limited, try later"
          : lastSyncedAt
            ? `synced ${relativeTime(lastSyncedAt)}`
            : `snapshot built ${relativeTime(base.generatedAt)}`}
      </span>
    </div>
  );
}

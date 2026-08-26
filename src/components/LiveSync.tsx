"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, RefreshCw } from "lucide-react";
import { fetchLiveSnapshot, GithubApiError } from "@/lib/fetch-live";
import { useLiveDataStore } from "@/store/live-data-store";
import { relativeTime } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import type { GithubSnapshot } from "@/lib/types";

export default function LiveSync({ base }: { base: GithubSnapshot }) {
  const setLiveSnapshot = useLiveDataStore((s) => s.setLiveSnapshot);
  const lastSyncedAt = useLiveDataStore((s) => s.lastSyncedAt);
  const updateVersion = useLiveDataStore((s) => s.updateVersion);
  const hydrated = useHydrated();

  const { refetch, isFetching, isError, error } = useQuery({
    queryKey: ["live-github-snapshot", base.profile.login],
    queryFn: async () => {
      const snapshot = await fetchLiveSnapshot(base.profile.login, base);
      setLiveSnapshot(snapshot);
      return snapshot;
    },
    enabled: false,
    staleTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    // A manual refresh is user-initiated; retrying a rate-limited request only
    // burns more of the shared unauthenticated budget. Other transient failures
    // may retry once.
    retry: (failureCount, error) => {
      if (error instanceof GithubApiError && error.status === 403) return false;
      return failureCount < 1;
    },
  });
  const apiError = error instanceof GithubApiError ? error : null;
  const isRateLimited = apiError?.status === 403;
  const rateLimitReset = isRateLimited && apiError?.rateLimitReset
    ? new Date(Number(apiError.rateLimitReset) * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

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
          ? isRateLimited
            ? `GitHub API limit reached${rateLimitReset ? ` — after ${rateLimitReset}` : " — try later"}`
            : "Sync failed — try again later"
          : lastSyncedAt
            ? `${updateVersion > 0 ? "API refreshed" : "synced"} ${relativeTime(lastSyncedAt)}`
            : hydrated
              ? `Snapshot built ${relativeTime(base.generatedAt)}`
              : `Snapshot built ${new Date(base.generatedAt).toUTCString()}`}
      </span>
    </div>
  );
}

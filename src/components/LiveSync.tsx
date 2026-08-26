"use client";

import { useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { fetchLiveSnapshot, GithubApiError } from "@/lib/fetch-live";
import { classifyRateLimit, rateLimitRetryTime } from "@/lib/rate-limit";
import { useLiveDataStore } from "@/store/live-data-store";
import { relativeTime } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import type { GithubSnapshot } from "@/lib/types";

type SyncState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success" }
  | { phase: "error"; error: unknown };

// A single manual "Sync now" action with an explicit idle → loading →
// success/error state machine. No polling, no window-focus refetch, and no
// blind retry: the user presses the button again to try again. A failed
// refresh never touches the existing snapshot.
export default function LiveSync({ base }: { base: GithubSnapshot }) {
  const setLiveSnapshot = useLiveDataStore((s) => s.setLiveSnapshot);
  const lastSyncedAt = useLiveDataStore((s) => s.lastSyncedAt);
  const updateVersion = useLiveDataStore((s) => s.updateVersion);
  const hydrated = useHydrated();
  const [status, setStatus] = useState<SyncState>({ phase: "idle" });

  const isFetching = status.phase === "loading";

  async function sync() {
    if (isFetching) return;
    setStatus({ phase: "loading" });
    try {
      const snapshot = await fetchLiveSnapshot(base.profile.login, base);
      setLiveSnapshot(snapshot);
      setStatus({ phase: "success" });
    } catch (error) {
      setStatus({ phase: "error", error });
    }
  }

  const apiError = status.phase === "error" && status.error instanceof GithubApiError ? status.error : null;
  const rateLimit = apiError
    ? classifyRateLimit(apiError.status, apiError.rateLimitRemaining, apiError.rateLimitReset, apiError.retryAfter)
    : null;
  const retryTiming = rateLimit ? rateLimitRetryTime(rateLimit) : null;
  const failureMessage = rateLimit?.isRateLimited
    ? `GitHub API limit reached${retryTiming ? ` — ${retryTiming}` : " — try later"}`
    : "Sync failed — try again later";

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-text-faint" aria-live="polite">
      <button
        type="button"
        onClick={() => {
          void sync();
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
        {status.phase === "error"
          ? failureMessage
          : lastSyncedAt
            ? `${updateVersion > 0 ? "API refreshed" : "synced"} ${relativeTime(lastSyncedAt)}`
            : hydrated
              ? `Snapshot built ${relativeTime(base.generatedAt)}`
              : `Snapshot built ${new Date(base.generatedAt).toUTCString()}`}
      </span>
    </div>
  );
}

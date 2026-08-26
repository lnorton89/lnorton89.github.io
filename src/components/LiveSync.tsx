"use client";

import { useState } from "react";
import { Check, RefreshCw, TriangleAlert } from "lucide-react";
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

export default function LiveSync({ base }: { base: GithubSnapshot }) {
  const setLiveSnapshot = useLiveDataStore((s) => s.setLiveSnapshot);
  const lastSyncedAt = useLiveDataStore((s) => s.lastSyncedAt);
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
    ? classifyRateLimit(
        apiError.status,
        apiError.rateLimitRemaining,
        apiError.rateLimitReset,
        apiError.retryAfter,
        apiError.responseMessage,
      )
    : null;
  const retryTiming = rateLimit?.isRateLimited ? rateLimitRetryTime(rateLimit) : null;
  const lastGoodAt = lastSyncedAt ?? base.generatedAt;

  const buttonLabel = status.phase === "loading"
    ? "Syncing"
    : status.phase === "success"
      ? "Updated"
      : status.phase === "error"
        ? "Retry sync"
        : "Sync now";

  const statusText = status.phase === "error"
    ? rateLimit?.isRateLimited
      ? `GitHub API limit reached${retryTiming ? ` — retry ${retryTiming}` : " — try later"}; showing data from ${relativeTime(lastGoodAt)}`
      : `Refresh failed — showing data from ${relativeTime(lastGoodAt)}`
    : lastSyncedAt
      ? `API refreshed ${relativeTime(lastSyncedAt)}`
      : hydrated
        ? `Snapshot built ${relativeTime(base.generatedAt)}`
        : `Snapshot built ${new Date(base.generatedAt).toUTCString()}`;

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-text-faint" aria-live="polite">
      <button
        type="button"
        onClick={() => void sync()}
        disabled={isFetching}
        className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface-raised px-3 py-1.5 text-text-muted transition-colors hover:border-cyan/50 hover:text-cyan disabled:opacity-50"
      >
        {status.phase === "success" ? (
          <Check className="h-3 w-3 text-cyan" aria-hidden="true" />
        ) : status.phase === "error" ? (
          <TriangleAlert className="h-3 w-3 text-amber" aria-hidden="true" />
        ) : (
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
        )}
        {buttonLabel}
      </button>
      <span>{statusText}</span>
    </div>
  );
}

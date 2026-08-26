// GitHub rate-limit classification. A 403 is NOT automatically a rate limit:
// GitHub returns plain 403 for forbidden requests too. A genuine rate limit is
// signalled by the combination of status and rate-limit headers:
//   - 429 (secondary rate limit) — usually carries `retry-after`
//   - 403 with `x-ratelimit-remaining: 0` (primary rate limit) — carries
//     `x-ratelimit-reset` (epoch seconds)
export interface RateLimitInfo {
  isRateLimited: boolean;
  /** "primary" | "secondary" | "none" */
  kind: "primary" | "secondary" | "none";
  /** Epoch-seconds string when a reset time is available. */
  resetAt: string | null;
  /** Seconds until retry when a retry-after header is available. */
  retryAfter: string | null;
}

export function classifyRateLimit(
  status: number,
  rateLimitRemaining: string | null,
  rateLimitReset: string | null,
  retryAfter: string | null
): RateLimitInfo {
  if (status === 429) {
    return {
      isRateLimited: true,
      kind: "secondary",
      resetAt: rateLimitReset,
      retryAfter,
    };
  }
  if (status === 403 && rateLimitRemaining === "0") {
    return {
      isRateLimited: true,
      kind: "primary",
      resetAt: rateLimitReset,
      retryAfter,
    };
  }
  return { isRateLimited: false, kind: "none", resetAt: null, retryAfter: null };
}

// A human-readable retry time for display, preferring the most specific signal.
export function rateLimitRetryTime(info: RateLimitInfo): string | null {
  if (info.retryAfter && /^\d+$/.test(info.retryAfter)) {
    const seconds = Number(info.retryAfter);
    if (seconds > 0) return `in ${seconds} seconds`;
  }
  if (info.resetAt && /^\d+$/.test(info.resetAt)) {
    const date = new Date(Number(info.resetAt) * 1000);
    if (!Number.isNaN(date.getTime())) {
      return `after ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
  }
  return null;
}

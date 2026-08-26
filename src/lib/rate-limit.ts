// GitHub rate-limit classification. A plain 403 is not automatically a rate
// limit: primary and secondary limits need to be distinguished from ordinary
// forbidden responses.
export interface RateLimitInfo {
  isRateLimited: boolean;
  kind: "primary" | "secondary" | "none";
  resetAt: string | null;
  retryAfter: string | null;
}

export function classifyRateLimit(
  status: number,
  rateLimitRemaining: string | null,
  rateLimitReset: string | null,
  retryAfter: string | null,
  responseMessage: string | null = null
): RateLimitInfo {
  const limitedStatus = status === 403 || status === 429;
  if (limitedStatus && rateLimitRemaining === "0") {
    return {
      isRateLimited: true,
      kind: "primary",
      resetAt: rateLimitReset,
      retryAfter,
    };
  }

  const messageSignalsSecondary = /secondary rate limit|abuse detection/i.test(responseMessage ?? "");
  if (limitedStatus && (retryAfter || messageSignalsSecondary || status === 429)) {
    return {
      isRateLimited: true,
      kind: "secondary",
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

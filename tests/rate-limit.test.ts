import { describe, it, expect } from "vitest";
import { classifyRateLimit, rateLimitRetryTime } from "../src/lib/rate-limit";

describe("classifyRateLimit", () => {
  it("recognizes 429 as a rate limit regardless of headers", () => {
    expect(classifyRateLimit(429, null, null, "10")).toMatchObject({
      isRateLimited: true,
      kind: "secondary",
      retryAfter: "10",
    });
  });

  it("recognizes 403 with x-ratelimit-remaining 0 as a primary rate limit", () => {
    expect(classifyRateLimit(403, "0", "1700000000", null)).toMatchObject({
      isRateLimited: true,
      kind: "primary",
      resetAt: "1700000000",
    });
  });

  it("does NOT call a generic 403 a rate limit", () => {
    expect(classifyRateLimit(403, "59", "1700000000", null).isRateLimited).toBe(false);
    expect(classifyRateLimit(403, null, null, null).isRateLimited).toBe(false);
  });

  it("treats 404/500 as not rate-limited", () => {
    expect(classifyRateLimit(404, "0", null, null).isRateLimited).toBe(false);
    expect(classifyRateLimit(500, "0", null, null).isRateLimited).toBe(false);
  });
});

describe("rateLimitRetryTime", () => {
  it("prefers retry-after when present", () => {
    expect(rateLimitRetryTime(classifyRateLimit(429, null, null, "45"))).toBe("in 45 seconds");
  });

  it("falls back to the reset timestamp", () => {
    const info = classifyRateLimit(403, "0", "1700000000", null);
    expect(rateLimitRetryTime(info)).toMatch(/^after /);
  });

  it("returns null when no timing is available", () => {
    expect(rateLimitRetryTime(classifyRateLimit(429, null, null, null))).toBeNull();
  });
});

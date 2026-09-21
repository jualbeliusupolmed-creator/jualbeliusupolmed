import { describe, it, expect } from "vitest";
import { rateLimit, rateLimitDistributed } from "@/lib/rateLimit";

describe("rateLimit", () => {
  it("mengizinkan request dalam batas limit", () => {
    const key = `test-ip-${Date.now()}-1`;
    const res1 = rateLimit(key, { limit: 3, windowMs: 10_000 });
    const res2 = rateLimit(key, { limit: 3, windowMs: 10_000 });
    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
  });

  it("menolak request yang melebihi batas dan memberikan retryAfter", () => {
    const key = `test-ip-${Date.now()}-2`;
    rateLimit(key, { limit: 2, windowMs: 10_000 });
    rateLimit(key, { limit: 2, windowMs: 10_000 });
    const blocked = rateLimit(key, { limit: 2, windowMs: 10_000 });
    expect(blocked.ok).toBe(false);
    expect(typeof blocked.retryAfter).toBe("number");
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("rateLimitDistributed otomatis fallback ke in-memory saat Upstash env tidak diset", async () => {
    const key = `test-ip-${Date.now()}-3`;
    const res = await rateLimitDistributed(key, { limit: 5, windowMs: 10_000 });
    expect(res.ok).toBe(true);
  });
});

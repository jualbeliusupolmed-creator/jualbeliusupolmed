import { describe, expect, it } from "vitest";
import {
  resolveInstagramMenfessDateRange,
  summarizeInstagramMenfessAnalytics,
} from "@/lib/instagramMenfessAnalytics";

describe("Instagram Menfess analytics helpers", () => {
  it("uses Jakarta dates for preset periods", () => {
    const range = resolveInstagramMenfessDateRange({
      period: "7d",
      now: new Date("2026-10-14T17:00:00.000Z"),
    });

    expect(range).toEqual({
      from: "2026-10-09",
      to: "2026-10-15",
      startAt: "2026-10-08T17:00:00.000Z",
      endAt: "2026-10-15T17:00:00.000Z",
      days: 7,
    });
  });

  it("rejects normalized-invalid dates and ranges longer than 90 days", () => {
    expect(() => resolveInstagramMenfessDateRange({ period: "all" }))
      .toThrow("Periode analitik tidak valid.");

    expect(() => resolveInstagramMenfessDateRange({
      period: "custom",
      from: "2026-02-30",
      to: "2026-03-01",
    })).toThrow("Rentang tanggal kustom tidak valid.");

    expect(() => resolveInstagramMenfessDateRange({
      period: "custom",
      from: "2026-01-01",
      to: "2026-04-01",
    })).toThrow("maksimal 90 hari");
  });

  it("aggregates unique senders, returning senders, daily counts and Jakarta time patterns", () => {
    const result = summarizeInstagramMenfessAnalytics({
      dateRange: { from: "2026-10-15", to: "2026-10-16", days: 2 },
      events: [
        { sender_id: "private-a", created_at: "2026-10-15T16:30:00.000Z" },
        { sender_id: "private-a", created_at: "2026-10-16T02:00:00.000Z" },
        { sender_id: "private-b", created_at: "2026-10-16T12:15:00.000Z" },
      ],
      priorSenderIds: new Set(["private-a"]),
    });

    expect(result.summary).toEqual({
      received: 3,
      activeSenders: 2,
      newSenders: 1,
      returningSenders: 1,
    });
    expect(result.daily).toEqual([
      { date: "2026-10-15", total: 1 },
      { date: "2026-10-16", total: 2 },
    ]);
    expect(result.hourly[0].total).toBe(0);
    expect(result.hourly[9].total).toBe(1);
    expect(result.hourly[19].total).toBe(1);
    expect(result.hourly[23].total).toBe(1);
    expect(result.weekdays[4].total).toBe(1);
    expect(result.weekdays[5].total).toBe(2);
    expect(JSON.stringify(result)).not.toContain("private-a");
    expect(JSON.stringify(result)).not.toContain("sender_id");
  });
});

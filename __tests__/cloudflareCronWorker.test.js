import { describe, expect, it, vi } from "vitest";
import { dispatchCloudflareCron, getCloudflareCronRoutes } from "@/lib/cloudflareCronWorker";

describe("Cloudflare scheduled jobs", () => {
  it("maps each production schedule to its existing cron route", () => {
    expect(getCloudflareCronRoutes("0 8 * * *")).toEqual([
      "/api/cron/expire",
      "/api/cron/auto-bump",
    ]);
    expect(getCloudflareCronRoutes("0 1,2,3 * * *", Date.UTC(2026, 10, 23, 1))).toEqual([
      "/api/cron/daily-digest",
      "/api/cron/weekly-report",
    ]);
    expect(getCloudflareCronRoutes("0 1,2,3 * * *", Date.UTC(2026, 10, 24, 1))).toEqual([
      "/api/cron/daily-digest",
    ]);
    expect(getCloudflareCronRoutes("0 1,2,3 * * *", Date.UTC(2026, 10, 25, 2))).toEqual([
      "/api/cron/deal-followup",
    ]);
    expect(getCloudflareCronRoutes("0 1,2,3 * * *", Date.UTC(2026, 10, 25, 3))).toEqual([
      "/api/cron/instagram-menfess",
    ]);
    expect(() => getCloudflareCronRoutes("0 4 * * *")).toThrow(
      "Unknown Cloudflare cron schedule"
    );
    expect(() => getCloudflareCronRoutes("0 1,2,3 * * *")).toThrow(
      "Scheduled time is required"
    );
  });

  it("dispatches the scheduled routes through the self-binding with cron auth", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    await dispatchCloudflareCron(
      { cron: "0 8 * * *" },
      {
        CRON_SECRET: "test-secret",
        WORKER_SELF_REFERENCE: { fetch },
      }
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([request]) => new URL(request.url).pathname)).toEqual([
      "/api/cron/expire",
      "/api/cron/auto-bump",
    ]);
    expect(fetch.mock.calls[0][0].headers.get("authorization")).toBe("Bearer test-secret");
  });

  it("surfaces non-success responses without exposing response bodies", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("private response", { status: 503 }));
    await expect(
      dispatchCloudflareCron(
        { cron: "0 1,2,3 * * *", scheduledTime: Date.UTC(2026, 10, 25, 2) },
        {
          CRON_SECRET: "test-secret",
          WORKER_SELF_REFERENCE: { fetch },
        }
      )
    ).rejects.toThrow("/api/cron/deal-followup (503)");
  });
});

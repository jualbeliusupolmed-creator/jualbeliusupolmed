import { describe, expect, it } from "vitest";
import { getOpenPoBatchMetrics } from "./openPoDisplay";

describe("getOpenPoBatchMetrics", () => {
  it("uses the Open PO API fields for progress, image, and deadline", () => {
    expect(
      getOpenPoBatchMetrics({
        quota: "8",
        reserved: "3",
        photo: "https://example.test/po.jpg",
        closes_at: "2026-12-01T10:00:00.000Z",
      })
    ).toEqual({
      quota: 8,
      reserved: 3,
      remaining: 5,
      progress: 38,
      photo: "https://example.test/po.jpg",
      closesAt: "2026-12-01T10:00:00.000Z",
    });
  });

  it("does not invent a quota or progress when the backend value is missing", () => {
    expect(getOpenPoBatchMetrics({})).toMatchObject({
      quota: 0,
      reserved: 0,
      remaining: 0,
      progress: 0,
      photo: "",
      closesAt: null,
    });
  });
});

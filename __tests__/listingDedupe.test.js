import { describe, it, expect, vi } from "vitest";
import { findRecentDuplicateListing, normalizeListingTitleKey } from "@/lib/listingDedupe";

describe("listingDedupe", () => {
  it("normalizes listing title keys consistently", () => {
    expect(normalizeListingTitleKey("  Jam   Tangan  ")).toBe("jam tangan");
    expect(normalizeListingTitleKey("Catokan")).toBe("catokan");
    expect(normalizeListingTitleKey("")).toBe("");
  });

  it("returns matching recent listing when seller_wa, title, and price match", async () => {
    const existing = {
      id: "dup-1",
      seller_wa: "6281234567890",
      title: "  Jam   Tangan ",
      price: 70000,
      status: "active",
    };
    const supa = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({ data: [existing], error: null })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    };

    const match = await findRecentDuplicateListing(supa, {
      sellerWa: "6281234567890",
      title: "jam tangan",
      price: 70000,
      windowMinutes: 30,
    });

    expect(match).toEqual(existing);
  });

  it("returns null safely when Supabase mock is partial or throws", async () => {
    const partialSupa = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({})),
        })),
      })),
    };

    const match = await findRecentDuplicateListing(partialSupa, {
      sellerWa: "6281234567890",
      title: "Jam tangan",
      price: 70000,
    });

    expect(match).toBeNull();
  });
});

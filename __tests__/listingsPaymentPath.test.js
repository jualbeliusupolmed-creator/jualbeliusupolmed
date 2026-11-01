import { describe, it, expect, vi, beforeEach } from "vitest";
import * as settingsLib from "@/lib/settings";
import * as authLib from "@/lib/auth";
import * as fonnteLib from "@/lib/fonnte";

vi.mock("@/lib/settings", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getSettings: vi.fn(),
  };
});

import { POST as listingsPost } from "@/app/api/listings/route";

const mockListing = {
  id: "listing-pay-12345678",
  title: "Laptop ASUS Zenbook",
  price: 5000000,
  seller_wa: "081234567890",
  seller_name: "Ahmad Dani",
  status: "active",
};

const mockPayments = [];

let mockSettingsPricing = null;

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: vi.fn(() => ({
    from: (table) => {
      if (table === "settings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: mockSettingsPricing ? { value: mockSettingsPricing } : null, error: null })),
            })),
          })),
        };
      }
      if (table === "payments") {
        return {
          insert: vi.fn((data) => {
            mockPayments.push(data);
            return Promise.resolve({ data, error: null });
          }),
        };
      }
      if (table === "listings") {
        return {
          insert: vi.fn((data) => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { ...mockListing, ...data }, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              in: vi.fn(() => Promise.resolve({ count: 1, error: null })),
            })),
          })),
        };
      }
      if (table === "seller_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: { wa: "081234567890", name: "Ahmad Dani", store_status: "draf" }, error: null })),
            })),
          })),
          upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      };
    },
  })),
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
  rateLimitDistributed: vi.fn(() => ({ ok: true })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/moderationRules", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    moderateListing: vi.fn(() => Promise.resolve({ status: "approved", moderation_reason: "Lolos" })),
  };
});

vi.mock("@/lib/fonnte", () => ({
  postToGroup: vi.fn(() => Promise.resolve({ ok: true })),
  notifyCategorySubscribers: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("@/lib/listingInstagram", () => ({
  autoPublishListingInstagram: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("@/lib/webpush", () => ({
  pushListingBaru: vi.fn(() => Promise.resolve({ ok: true })),
}));

describe("Tahap 4 - Listing Route Paid vs Free Path Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPayments.length = 0;
    vi.spyOn(authLib, "getSellerSession").mockReturnValue("081234567890");
  });

  it("handles paid mode correctly without dead code: creates payment record and returns paymentUrl", async () => {
    mockSettingsPricing = { freeMode: false, adFee: 5000, listingDays: 14 };
    vi.mocked(settingsLib.getSettings).mockResolvedValue({
      pricing: { freeMode: false, adFee: 5000, listingDays: 14 },
    });

    const payload = {
      seller_name: "Ahmad Dani",
      seller_wa: "081234567890",
      title: "Buku Kalkulus Purcell Edisi 9",
      description: "Buku kuliah mulus untuk semester 1",
      price: "150.000",
      stock: 1,
      category: "Buku Kuliah",
      type: "barang",
    };

    const req = new Request("https://test.com/api/listings", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await listingsPost(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.isFreeMode).toBe(false);
    expect(json.paymentUrl).toBe("/qris.png");
    expect(json.amount).toBe(5000);
    expect(json.orderId).toBeDefined();

    // Pastikan record payments terbuat
    expect(mockPayments.length).toBe(1);
    expect(mockPayments[0].type).toBe("iklan");
    expect(mockPayments[0].amount).toBe(5000);
    expect(mockPayments[0].status).toBe("pending");

    // Pastikan belum disebarkan ke grup WA sebelum dibayar
    expect(fonnteLib.postToGroup).not.toHaveBeenCalled();
  });

  it("handles free mode correctly: activates listing and broadcasts immediately", async () => {
    // Mode gratis aktif
    mockSettingsPricing = { freeMode: true, adFee: 0, listingDays: 14 };
    vi.mocked(settingsLib.getSettings).mockResolvedValue({
      pricing: { freeMode: true, adFee: 0, listingDays: 14 },
    });

    const payload = {
      seller_name: "Ahmad Dani",
      seller_wa: "081234567890",
      title: "Buku Kalkulus Purcell Edisi 9",
      description: "Buku kuliah mulus untuk semester 1",
      price: "150.000",
      stock: 1,
      category: "Buku Kuliah",
      type: "barang",
    };

    const req = new Request("https://test.com/api/listings", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await listingsPost(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.isFreeMode).toBe(true);
    expect(json.paymentUrl).toBeNull();
    expect(mockPayments.length).toBe(0);

    // Di mode gratis langsung disiarkan
    expect(fonnteLib.postToGroup).toHaveBeenCalled();
  });
});

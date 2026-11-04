import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as listingsPost } from "@/app/api/listings/route";
import { POST as wantedPost } from "@/app/api/wanted/route";
import * as authLib from "@/lib/auth";
import * as settingsLib from "@/lib/settings";

const mockInsertedListings = [];
const mockInsertedWanted = [];

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === "settings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: { value: { freeMode: true, adFee: 0 } }, error: null })),
            })),
          })),
        };
      }
      if (table === "seller_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: {
                    name: "Budi Santoso",
                    wa: "081234567890",
                    user_id: "auth-user-uuid-1234",
                    home_university_id: "ui",
                    subscription_tier: "free",
                  },
                  error: null,
                })
              ),
            })),
          })),
        };
      }
      if (table === "blacklist") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        };
      }
      if (table === "payments") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ count: 0, data: [] })),
              })),
            })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        };
      }
      if (table === "listings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({ count: 0, data: [] })),
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn((payload) => {
            const row = { id: "new-listing-uuid-5678", ...payload };
            mockInsertedListings.push(row);
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: row, error: null })),
              })),
            };
          }),
        };
      }
      if (table === "wanted_listings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ count: 0, data: [], error: null })),
          })),
          insert: vi.fn((payload) => {
            const row = { id: "new-wanted-uuid-9999", ...payload };
            mockInsertedWanted.push(row);
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: row, error: null })),
              })),
            };
          }),
        };
      }
      if (table === "universities") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [
                  { id: "ui", code: "UI" },
                  { id: "unj", code: "UNJ" },
                ],
                error: null,
              })
            ),
          })),
        };
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }),
  })),
}));

vi.mock("@/lib/fonnte", () => ({
  postToGroup: vi.fn(() => Promise.resolve({ ok: true })),
  postWantedToGroup: vi.fn(() => Promise.resolve({ ok: true })),
  notifyCategorySubscribers: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("@/lib/listingInstagram", () => ({
  autoPublishListingInstagram: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("@/lib/webpush", () => ({
  pushListingBaru: vi.fn(() => Promise.resolve({ ok: true })),
}));

describe("Fase 3 & 4: Penyelarasan Transaksi & Katalog Produk Nasional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertedListings.length = 0;
    mockInsertedWanted.length = 0;
    vi.spyOn(authLib, "getSellerSession").mockReturnValue("081234567890");
    vi.spyOn(settingsLib, "getSettings").mockResolvedValue({
      pricing: { freeMode: true, adFee: 0, listingDays: 14 },
      campuses: [
        { id: "usu", shortName: "USU", name: "Universitas Sumatera Utara", provinceId: "sumatera-utara", active: true },
        { id: "ui", shortName: "UI", name: "Universitas Indonesia", provinceId: "dki-jakarta", active: true },
        { id: "itb", shortName: "ITB", name: "Institut Teknologi Bandung", provinceId: "jawa-barat", active: true },
      ],
    });
  });

  it("menetapkan university_id dan user_id secara otomatis saat membuat listing di kampus nasional (UI)", async () => {
    const payload = {
      seller_name: "Budi Santoso",
      seller_wa: "081234567890",
      title: "MacBook Air M2 2023 Mulus Kampus UI",
      description: "Laptop kuliah, COD di sekitar Perpustakaan UI Depok",
      price: "12000000",
      stock: 1,
      category: "Elektronik",
      type: "barang",
      campus: "UI",
    };

    const req = new Request("https://test.com/api/listings", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await listingsPost(req);
    const json = await res.json();
    expect(res.status).toBe(200);

    // Verifikasi payload yang masuk ke database
    expect(mockInsertedListings.length).toBe(1);
    const inserted = mockInsertedListings[0];
    expect(inserted.campus).toBe("UI");
    expect(inserted.university_id).toBe("ui");
    expect(inserted.user_id).toBe("auth-user-uuid-1234");
    expect(inserted.seller_name).toBe("Budi Santoso");
  });

  it("mempertahankan pilihan lintas kampus dan tidak mewarisi home_university_id", async () => {
    const payload = {
      seller_name: "Budi Santoso",
      seller_wa: "081234567890",
      title: "Kalkulator Scientific Casio FX-991EX",
      description: "Kalkulator kuliah teknik",
      price: "250000",
      stock: 1,
      category: "Elektronik",
      type: "barang",
      campus: "Semua",
    };

    const req = new Request("https://test.com/api/listings", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await listingsPost(req);
    expect(res.status).toBe(200);

    expect(mockInsertedListings.length).toBe(1);
    const inserted = mockInsertedListings[0];
    expect(inserted.campus).toBe("Semua");
    expect(inserted.university_id).toBeNull();
    expect(inserted.user_id).toBe("auth-user-uuid-1234");
  });

  it("mempertahankan pilihan lintas kampus pada postingan barang dicari", async () => {
    const payload = {
      buyer_name: "Budi Santoso",
      buyer_wa: "081234567890",
      title: "Dicari buku lintas kampus",
      description: "Bisa COD",
      budget: 150000,
      category: "Buku",
      campus: "Semua",
      area: "Kampus",
    };

    const req = new Request("https://test.com/api/wanted", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await wantedPost(req);
    expect(res.status).toBe(200);
    expect(mockInsertedWanted).toHaveLength(1);
    expect(mockInsertedWanted[0].campus).toBe("Semua");
    expect(mockInsertedWanted[0].university_id).toBeNull();
  });

  it("menetapkan university_id dan user_id pada postingan barang dicari (WTB/Wanted)", async () => {
    const payload = {
      buyer_name: "Budi Santoso",
      buyer_wa: "081234567890",
      title: "Dicari Buku Fisika Dasar Halliday Resnick",
      description: "Butuh cepat edisi bahasa Indonesia",
      budget: 150000,
      category: "Buku",
      campus: "ITB",
      area: "Ganesha",
    };

    const req = new Request("https://test.com/api/wanted", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await wantedPost(req);
    expect(res.status).toBe(200);

    expect(mockInsertedWanted.length).toBe(1);
    const inserted = mockInsertedWanted[0];
    expect(inserted.campus).toBe("ITB");
    expect(inserted.university_id).toBe("itb");
    expect(inserted.user_id).toBe("auth-user-uuid-1234");
    expect(inserted.buyer_name).toBe("Budi Santoso");
  });
});

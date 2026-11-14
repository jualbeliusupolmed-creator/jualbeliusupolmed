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
        const profile = {
          name: "Budi Santoso",
          wa: "081234567890",
          user_id: "auth-user-uuid-1234",
          home_university_id: "usu",
          subscription_tier: "free",
        };
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(() => Promise.resolve({ data: profile, error: null })) })),
            or: vi.fn(() => ({ maybeSingle: vi.fn(() => Promise.resolve({ data: profile, error: null })) })),
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
        const universities = [
          { id: "usu", code: "USU", name: "Universitas Sumatera Utara", province_id: "sumatera-utara", status: "active" },
          { id: "ui", code: "UI", name: "Universitas Indonesia", province_id: "dki-jakarta", status: "active" },
          { id: "unj", code: "UNJ", name: "Universitas Negeri Jakarta", province_id: "dki-jakarta", status: "active" },
          { id: "itb", code: "ITB", name: "Institut Teknologi Bandung", province_id: "jawa-barat", status: "active" },
        ];
        return {
          select: vi.fn(() => ({
            eq: vi.fn((column, value) => column === "id"
              ? { maybeSingle: vi.fn(() => Promise.resolve({ data: universities.find((item) => item.id === value) || null, error: null })) }
              : { eq: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: universities.filter((item) => item.province_id === value), error: null })) })) }),
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
    vi.spyOn(authLib, "getSellerSessionAsync").mockResolvedValue("081234567890");
    vi.spyOn(settingsLib, "getSettings").mockResolvedValue({
      pricing: { freeMode: true, adFee: 0, listingDays: 14 },
      campuses: [
        { id: "usu", shortName: "USU", name: "Universitas Sumatera Utara", provinceId: "sumatera-utara", active: true },
        { id: "ui", shortName: "UI", name: "Universitas Indonesia", provinceId: "dki-jakarta", active: true },
        { id: "itb", shortName: "ITB", name: "Institut Teknologi Bandung", provinceId: "jawa-barat", active: true },
      ],
    });
  });

  it("menetapkan university_id dan user_id saat membuat listing di kampus sendiri", async () => {
    const payload = {
      seller_name: "Budi Santoso",
      seller_wa: "081234567890",
      title: "Laptop kuliah kampus USU",
      description: "Laptop kuliah, COD di sekitar kampus USU",
      price: "12000000",
      stock: 1,
      category: "Elektronik",
      type: "barang",
      campus: "USU",
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
    expect(inserted.campus).toBe("USU");
    expect(inserted.university_id).toBe("usu");
    expect(inserted.user_id).toBe("auth-user-uuid-1234");
    expect(inserted.seller_name).toBe("Budi Santoso");
  });

  it("mengabaikan kampus tujuan dari klien dan menetapkan provinsi asal penjual", async () => {
    const req = new Request("https://test.com/api/listings", {
      method: "POST",
      body: JSON.stringify({
        seller_name: "Budi Santoso",
        seller_wa: "081234567890",
        title: "Barang di luar provinsi",
        description: "Tidak boleh dipasang lintas provinsi",
        price: "250000",
        stock: 1,
        category: "Elektronik",
        type: "barang",
        campus: "UI",
      }),
    });

    const res = await listingsPost(req);
    expect(res.status).toBe(200);
    expect(mockInsertedListings).toHaveLength(1);
    expect(mockInsertedListings[0]).toMatchObject({
      campus: "USU",
      university_id: "usu",
      seller_university_id: "usu",
      seller_province_id: "sumatera-utara",
    });
  });

  it("mengubah pilihan Semua menjadi kampus acuan lokal", async () => {
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
    expect(inserted.campus).toBe("USU");
    expect(inserted.university_id).toBe("usu");
    expect(inserted.user_id).toBe("auth-user-uuid-1234");
  });

  it("mengubah pilihan Semua barang dicari menjadi kampus acuan lokal", async () => {
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
    expect(mockInsertedWanted[0].campus).toBe("USU");
    expect(mockInsertedWanted[0].university_id).toBe("usu");
  });

  it("menolak barang dicari di kampus luar provinsi akun", async () => {
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
    expect(res.status).toBe(403);
    expect(mockInsertedWanted).toHaveLength(0);
  });
});

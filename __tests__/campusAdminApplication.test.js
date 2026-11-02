import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimitDistributed: vi.fn(() => Promise.resolve(false)),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn(() => ({
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
}));
const mockInsert = vi.fn(() => ({
  select: mockSelect,
}));

const mockSupa = {
  from: vi.fn((table) => {
    if (table === "universities") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { id: "ui", name: "Universitas Indonesia", code: "UI", province_id: "dki-jakarta", status: "active" },
              error: null,
            })
          ),
        })),
      };
    }
    if (table === "university_admin_requests") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        insert: mockInsert,
      };
    }
    if (table === "admin_memberships") {
      return {
        select: vi.fn(() => ({
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { user_id: "d06fd157-84e2-48c3-b816-c01e71231ec8" },
              error: null,
            })
          ),
        })),
      };
    }
    if (table === "provinces") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn(() =>
            Promise.resolve({
              data: [
                { id: "dki-jakarta", name: "DKI Jakarta", status: "active" },
                { id: "sumatera-utara", name: "Sumatera Utara", status: "active" },
              ],
            })
          ),
        })),
      };
    }
    return {
      select: mockSelect,
      insert: mockInsert,
    };
  }),
};

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: vi.fn(() => mockSupa),
  supabaseAdmin: mockSupa,
}));

vi.mock("@/lib/settings", () => ({
  getSettings: vi.fn(() =>
    Promise.resolve({
      campuses: [
        { id: "usu", name: "Universitas Sumatera Utara", shortName: "USU", provinceId: "sumatera-utara", active: true },
        { id: "ui", name: "Universitas Indonesia", shortName: "UI", provinceId: "dki-jakarta", active: true },
      ],
      provinces: [
        { id: "sumatera-utara", name: "Sumatera Utara" },
        { id: "dki-jakarta", name: "DKI Jakarta" },
      ],
    })
  ),
  getCampusProvinceId: vi.fn((campus) => campus.provinceId || "sumatera-utara"),
}));

describe("Formulir Pendaftaran Admin Kampus Mandiri & API Kampus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pengajuan jika nama, email, atau nomor wa kosong", async () => {
    const { POST } = await import("@/app/api/admin-requests/apply/route");
    const req = {
      json: vi.fn(() =>
        Promise.resolve({
          name: "",
          email: "invalid-email",
          wa: "",
        })
      ),
    };

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeDefined();
  });

  it("berhasil menerima pengajuan admin kampus mandiri dan menyimpannya ke university_admin_requests", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "req-123", status: "pending", created_at: new Date().toISOString() },
      error: null,
    });

    const { POST } = await import("@/app/api/admin-requests/apply/route");
    const req = {
      json: vi.fn(() =>
        Promise.resolve({
          name: "Raden Budi",
          email: "budi@ui.ac.id",
          wa: "081234567890",
          instagram: "budi_ui",
          provinceId: "dki-jakarta",
          universityId: "ui",
          motivation: "Ingin mendirikan bursa resmi di kampus UI",
        })
      ),
    };

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.message).toContain("Universitas Indonesia");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        province_id: "dki-jakarta",
        university_id: "ui",
        requested_email: "budi@ui.ac.id",
        requested_name: "Raden Budi",
        status: "pending",
      })
    );
  });

  it("endpoint /api/kampus mengembalikan daftar kampus beserta provinceId dan katalog provinsi", async () => {
    const { GET } = await import("@/app/api/kampus/route");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.campuses)).toBe(true);
    expect(Array.isArray(json.provinces)).toBe(true);
    expect(json.campuses.some((c) => c.shortName === "UI" && c.provinceId === "dki-jakarta")).toBe(true);
    expect(json.provinces.some((p) => p.id === "dki-jakarta")).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminClient: vi.fn(),
  rateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mocks.rateLimit,
  getClientIp: mocks.getClientIp,
}));

import { GET } from "@/app/chat-wa/[id]/route";

describe("GET /chat-wa/[id] - WhatsApp Contact Proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.rateLimit.mockReturnValue({ ok: true });
  });

  it("normalizes phone number from 08xx to 628xx and redirects to wa.me", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "prod-1",
        title: "Kalkulator Casio",
        seller_wa: "081234567890",
        seller_name: "Dinda",
        status: "active",
        is_sold: false,
        is_hidden: false,
        listing_code: "CALC1",
      },
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table) => {
      if (table === "listings") return { select };
      if (table === "buyer_contacts") return { insert };
      return {};
    });
    mocks.getAdminClient.mockReturnValue({ from });

    const req = new Request("http://localhost/chat-wa/prod-1");
    const res = await GET(req, { params: { id: "prod-1" } });

    expect(res.status).toBe(307);
    const redirectLocation = res.headers.get("location");
    expect(redirectLocation).toContain("https://wa.me/6281234567890");
    expect(redirectLocation).toContain("Kalkulator");
    expect(redirectLocation).toContain("CALC1");
    expect(insert).toHaveBeenCalled();
  });

  it("includes COD spot in prefilled message if provided", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "prod-2",
        title: "Jaket Polmed",
        seller_wa: "628987654321",
        seller_name: "Rafi",
        status: "active",
        is_sold: false,
        is_hidden: false,
      },
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.getAdminClient.mockReturnValue({ from: vi.fn(() => ({ select, insert })) });

    const req = new Request("http://localhost/chat-wa/prod-2?cod=Pendopo+USU");
    const res = await GET(req, { params: { id: "prod-2" } });

    expect(res.status).toBe(307);
    const redirectLocation = res.headers.get("location");
    expect(redirectLocation).toContain("Pendopo");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mocks.rateLimit.mockReturnValue({ ok: false, retryAfter: 45 });

    const req = new Request("http://localhost/chat-wa/prod-1");
    const res = await GET(req, { params: { id: "prod-1" } });

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("45");
  });

  it("redirects safely to marketplace when listing is sold", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "prod-3",
        title: "Buku Bekas",
        seller_wa: "081234567890",
        is_sold: true,
      },
    });
    mocks.getAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })),
    });

    const req = new Request("http://localhost/chat-wa/prod-3");
    const res = await GET(req, { params: { id: "prod-3" } });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/jual-beli?pesan=Barang+sudah+terjual");
  });
});

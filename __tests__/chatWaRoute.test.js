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
        stock: 1,
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

    expect(res.status).toBe(302);
    const redirectLocation = res.headers.get("location");
    expect(redirectLocation).toContain("https://wa.me/6281234567890");
    expect(redirectLocation).toContain("Kalkulator");
    expect(redirectLocation).toContain("CALC1");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(select).toHaveBeenCalledWith("id, title, seller_wa, seller_name, status, stock, listing_code");
    expect(insert).toHaveBeenCalled();
  });

  it("supports async route params used by Next.js 15", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "prod-async",
        title: "Buku Catatan",
        seller_wa: "081234567890",
        seller_name: "Dina",
        status: "active",
        stock: 1,
      },
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mocks.getAdminClient.mockReturnValue({ from });

    const req = new Request("http://localhost/chat-wa/prod-async");
    const res = await GET(req, { params: Promise.resolve({ id: "prod-async" }) });

    expect(res.status).toBe(302);
    expect(mocks.getAdminClient).toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("https://wa.me/6281234567890");
  });

  it("includes COD spot in prefilled message if provided", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "prod-2",
        title: "Jaket Polmed",
        seller_wa: "628987654321",
        seller_name: "Rafi",
        status: "active",
        stock: 1,
      },
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.getAdminClient.mockReturnValue({ from: vi.fn(() => ({ select, insert })) });

    const req = new Request("http://localhost/chat-wa/prod-2?cod=Pendopo+USU");
    const res = await GET(req, { params: { id: "prod-2" } });

    expect(res.status).toBe(302);
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

  it("reports listing lookup errors instead of claiming the listing is missing", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42703" },
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    mocks.getAdminClient.mockReturnValue({ from: vi.fn(() => ({ select })) });
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const req = new Request("http://localhost/chat-wa/prod-1");
      const res = await GET(req, { params: { id: "prod-1" } });

      expect(res.status).toBe(503);
      expect(await res.text()).toContain("Kontak penjual sementara tidak dapat dibuka");
      expect(logError).toHaveBeenCalledWith("[chat-wa] Listing lookup failed:", "42703");
    } finally {
      logError.mockRestore();
    }
  });

  it("keeps the buyer in context with a clear unavailable response when listing is sold", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "prod-3",
        title: "Buku Bekas",
        seller_wa: "081234567890",
        status: "sold",
        stock: 0,
      },
    });
    mocks.getAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })),
    });

    const req = new Request("http://localhost/chat-wa/prod-3");
    const res = await GET(req, { params: { id: "prod-3" } });

    expect(res.status).toBe(410);
    expect(res.headers.get("location")).toBeNull();
    expect(await res.text()).toContain("sudah terjual");
  });

  it("does not redirect to the home page when an unexpected failure occurs", async () => {
    mocks.getAdminClient.mockImplementation(() => { throw new Error("temporary failure"); });
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const req = new Request("http://localhost/chat-wa/prod-1");
      const res = await GET(req, { params: { id: "prod-1" } });

      expect(res.status).toBe(503);
      expect(res.headers.get("location")).toBeNull();
      expect(await res.text()).toContain("WhatsApp belum dapat dibuka");
    } finally {
      logError.mockRestore();
    }
  });
});

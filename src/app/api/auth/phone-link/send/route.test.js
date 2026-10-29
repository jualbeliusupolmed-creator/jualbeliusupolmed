import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSellerSession: vi.fn(),
  getAdminClient: vi.fn(),
  rateLimitDistributed: vi.fn(),
  sendWa: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSellerSession: mocks.getSellerSession,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimitDistributed: mocks.rateLimitDistributed,
  getClientIp: () => "127.0.0.1",
}));

vi.mock("@/lib/fonnte", () => ({
  sendWa: mocks.sendWa,
}));

import { POST } from "./route";

const identity = "google_seller_ab123";
const phone = "089542912632";

function request(origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/phone-link/send", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ wa: phone }),
  });
}

function builder(result) {
  const query = {};
  for (const method of ["select", "eq", "or", "limit", "delete", "lt", "upsert"]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn(async () => result);
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return query;
}

function setup({ profile, conflict = null, listingCount = 0 }) {
  let sellerProfileReads = 0;
  const client = {
    from: vi.fn((table) => {
      if (table === "seller_profiles") {
        sellerProfileReads += 1;
        return builder({
          data: sellerProfileReads === 1 ? profile : conflict,
          error: null,
        });
      }
      if (table === "listings") return builder({ count: listingCount, error: null });
      if (table === "seller_phone_link_otps") return builder({ data: null, error: null });
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  mocks.getAdminClient.mockReturnValue(client);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSellerSession.mockReturnValue(identity);
  mocks.rateLimitDistributed.mockResolvedValue({ ok: true });
  mocks.sendWa.mockResolvedValue({ ok: true });
});

describe("POST /api/auth/phone-link/send", () => {
  it("sends a code for a Google session when email_google is missing on its profile", async () => {
    setup({
      profile: { wa: identity, phone_wa: null, email_google: null, auth_provider: null },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.sendWa).toHaveBeenCalledWith(
      phone,
      expect.stringContaining("Kode verifikasi WhatsApp"),
      null,
      300
    );
  });

  it("still rejects an unrelated email-only profile", async () => {
    setup({
      profile: { wa: identity.replace("google_", "email_"), phone_wa: null, email_google: null, auth_provider: "email" },
    });

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(mocks.sendWa).not.toHaveBeenCalled();
  });

  it("reports missing bot configuration and does not claim delivery", async () => {
    setup({
      profile: { wa: identity, phone_wa: null, email_google: null, auth_provider: null },
    });
    mocks.sendWa.mockResolvedValue({ ok: false, code: "gateway_not_configured" });

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "gateway_not_configured",
      error: expect.stringContaining("BAILEYS_API_URL"),
    });
  });
});

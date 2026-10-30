import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSellerSession: vi.fn(),
  getAdminClient: vi.fn(),
  rateLimitDistributed: vi.fn(),
  sendWa: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSellerSession: mocks.getSellerSession }));
vi.mock("@/lib/supabaseAdmin", () => ({ getAdminClient: mocks.getAdminClient }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimitDistributed: mocks.rateLimitDistributed,
  getClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/fonnte", () => ({ sendWa: mocks.sendWa }));

import { POST } from "./route";

const phone = "081234567890";

function request(origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/google-link/send-otp", {
    method: "POST",
    headers: { origin },
  });
}

function query(result) {
  const builder = {};
  for (const method of ["select", "eq", "or", "upsert", "delete"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSellerSession.mockReturnValue(phone);
  mocks.rateLimitDistributed.mockResolvedValue({ ok: true });
  mocks.sendWa.mockResolvedValue({ ok: true });
  mocks.getAdminClient.mockReturnValue({
    from: vi.fn((table) => {
      if (table === "seller_profiles") {
        return query({ data: { wa: "google_account_abc123", phone_wa: phone, email_google: null }, error: null });
      }
      if (table === "seller_phone_link_otps") return query({ data: null, error: null });
      throw new Error(`Unexpected table: ${table}`);
    }),
  });
});

describe("POST /api/auth/google-link/send-otp", () => {
  it("sends an OTP to the signed-in WhatsApp profile", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.sendWa).toHaveBeenCalledWith(
      phone,
      expect.stringContaining("menautkan Google"),
      null,
      300
    );
  });

  it("finds a profile whose WhatsApp number is linked through phone_wa", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
  });

  it("rejects requests from a different origin", async () => {
    const response = await POST(request("https://attacker.example"));

    expect(response.status).toBe(403);
    expect(mocks.sendWa).not.toHaveBeenCalled();
  });

  it("reports missing bot configuration and does not claim delivery", async () => {
    mocks.sendWa.mockResolvedValue({ ok: false, code: "gateway_not_configured" });

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "gateway_not_configured",
      error: expect.stringContaining("BAILEYS_API_URL"),
    });
  });
});

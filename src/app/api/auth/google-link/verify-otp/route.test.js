import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSellerSession: vi.fn(),
  getAdminClient: vi.fn(),
  rateLimitDistributed: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSellerSession: mocks.getSellerSession }));
vi.mock("@/lib/supabaseAdmin", () => ({ getAdminClient: mocks.getAdminClient }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimitDistributed: mocks.rateLimitDistributed,
  getClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/otp", () => ({ verifyOtp: mocks.verifyOtp }));

import { POST } from "./route";

const phone = "081234567890";

function request(body, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/google-link/verify-otp", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function query(result) {
  const builder = {};
  for (const method of ["select", "eq", "or", "update", "delete"]) {
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
  mocks.verifyOtp.mockReturnValue(true);
  mocks.getAdminClient.mockReturnValue({
    from: vi.fn((table) => {
      if (table === "seller_profiles") {
        return query({ data: { wa: "google_account_abc123", phone_wa: phone, email_google: null }, error: null });
      }
      if (table === "seller_phone_link_otps") {
        return query({
          data: {
            profile_wa: "google_account_abc123",
            otp_hash: "hashed-code",
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            attempts: 0,
          },
          error: null,
        });
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  });
});

describe("POST /api/auth/google-link/verify-otp", () => {
  it("sets a short-lived proof cookie after verifying the OTP", async () => {
    const response = await POST(request({ otp: "123456" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("seller_google_otp_proof=");
    expect(mocks.verifyOtp).toHaveBeenCalledWith("123456", "hashed-code");
  });

  it("rejects a wrong OTP without issuing proof", async () => {
    mocks.verifyOtp.mockReturnValue(false);

    const response = await POST(request({ otp: "123456" }));

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

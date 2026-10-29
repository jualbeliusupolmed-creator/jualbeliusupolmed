import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSellerSession: vi.fn(),
  setSellerCookie: vi.fn(),
  getAdminClient: vi.fn(),
  verifyOtp: vi.fn(),
  rateLimitDistributed: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSellerSession: mocks.getSellerSession,
  setSellerCookie: mocks.setSellerCookie,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("@/lib/otp", () => ({
  verifyOtp: mocks.verifyOtp,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimitDistributed: mocks.rateLimitDistributed,
  getClientIp: () => "127.0.0.1",
}));

import { POST } from "./route";

const profileIdentity = "google_seller_ab123";
const phone = "081234567890";

function request(body, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/phone-link/verify", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function query(result) {
  const builder = {};
  for (const method of ["select", "eq", "or", "neq", "limit", "is", "update", "delete"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

function supabase({ phoneConflict = null } = {}) {
  let profileSelectCount = 0;
  const client = {
    rpc: vi.fn(async () => ({ error: null })),
    from: vi.fn((table) => {
      if (table === "seller_profiles") {
        profileSelectCount += 1;
        if (profileSelectCount === 1) {
          return query({
            data: { wa: profileIdentity, phone_wa: null, email_google: "seller@example.com" },
            error: null,
          });
        }
        if (profileSelectCount === 2) {
          return query({ data: phoneConflict, error: null });
        }
        return query({ data: { wa: profileIdentity }, error: null });
      }
      if (table === "seller_phone_link_otps") {
        return query({
          data: {
            profile_wa: profileIdentity,
            otp_hash: "hashed-otp",
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            attempts: 0,
          },
          error: null,
        });
      }
      if (table === "listings") return query({ count: 0, error: null });
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  mocks.getAdminClient.mockReturnValue(client);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSellerSession.mockReturnValue(profileIdentity);
  mocks.verifyOtp.mockReturnValue(true);
  mocks.rateLimitDistributed.mockResolvedValue({ ok: true });
});

describe("POST /api/auth/phone-link/verify", () => {
  it("attaches a verified number to the existing Google profile", async () => {
    supabase();

    const response = await POST(request({ wa: phone, otp: "123456" }));

    expect(response.status).toBe(200);
    expect(mocks.setSellerCookie).toHaveBeenCalledWith(phone);
    expect(mocks.verifyOtp).toHaveBeenCalledWith("123456", "hashed-otp");
  });

  it("merges the Google profile into the verified WhatsApp profile", async () => {
    const client = supabase({ phoneConflict: { wa: phone } });

    const response = await POST(request({ wa: phone, otp: "123456" }));

    expect(response.status).toBe(200);
    expect(client.rpc).toHaveBeenCalledWith(
      "merge_seller_profiles",
      expect.objectContaining({ p_source_wa: profileIdentity, p_canonical_wa: phone })
    );
    expect(mocks.setSellerCookie).toHaveBeenCalledWith(phone);
  });

  it("rejects a non-Google phone session before reading account data", async () => {
    mocks.getSellerSession.mockReturnValue(phone);
    const client = supabase();

    const response = await POST(request({ wa: phone, otp: "123456" }));

    expect(response.status).toBe(403);
    expect(client.from).not.toHaveBeenCalled();
  });
});

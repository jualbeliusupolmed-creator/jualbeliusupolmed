import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSellerSession: vi.fn(),
  getAdminClient: vi.fn(),
  proofCookie: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSellerSession: mocks.getSellerSession,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("next/headers", () => ({
  cookies: () => ({ get: mocks.proofCookie }),
}));

import { POST } from "./route";
import { createSellerGoogleLinkToken, SELLER_GOOGLE_OTP_PROOF_COOKIE } from "@/lib/seller-google-link";

const originalSecret = process.env.SESSION_SECRET;

function request(origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/google-link/start", {
    method: "POST",
    headers: { origin },
  });
}

function profileQuery(profile) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: profile, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  mocks.getAdminClient.mockReturnValue({ from });
}

beforeEach(() => {
  process.env.SESSION_SECRET = "google-link-test-secret";
  vi.clearAllMocks();
  mocks.proofCookie.mockReturnValue(undefined);
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
});

describe("POST /api/auth/google-link/start", () => {
  it("only starts for a phone-authenticated profile without a Google identity", async () => {
    mocks.getSellerSession.mockReturnValue("081234567890");
    mocks.proofCookie.mockReturnValue({
      value: createSellerGoogleLinkToken("081234567890"),
    });
    profileQuery({ wa: "081234567890", email_google: null });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("seller_google_link=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain(`${SELLER_GOOGLE_OTP_PROOF_COOKIE}=`);
  });

  it("requires a verified WhatsApp OTP before starting OAuth", async () => {
    mocks.getSellerSession.mockReturnValue("081234567890");

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects Google-only sessions without creating a link challenge", async () => {
    mocks.getSellerSession.mockReturnValue("google_account_abc123");

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects requests from a different origin", async () => {
    const response = await POST(request("https://attacker.example"));

    expect(response.status).toBe(403);
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });
});

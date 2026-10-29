import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSellerSession: vi.fn(),
  setSellerCookie: vi.fn(),
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSellerSession: mocks.getSellerSession,
  setSellerCookie: mocks.setSellerCookie,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

import { GET } from "./route";

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renews the cookie for a verified seller session", async () => {
    mocks.getSellerSession.mockReturnValue("seller-id");
    const maybeSingle = vi.fn().mockResolvedValue({ data: { name: "Seller", wa: "seller-id" } });
    const or = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ or }));
    const from = vi.fn(() => ({ select }));
    mocks.getAdminClient.mockReturnValue({ from });

    const response = await GET();

    expect(mocks.setSellerCookie).toHaveBeenCalledWith("seller-id");
    expect(await response.json()).toMatchObject({
      loggedIn: true,
      wa: "seller-id",
      name: "Seller",
    });
  });

  it("does not renew a missing session", async () => {
    mocks.getSellerSession.mockReturnValue(null);

    const response = await GET();

    expect(mocks.setSellerCookie).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ loggedIn: false, wa: null });
  });
});

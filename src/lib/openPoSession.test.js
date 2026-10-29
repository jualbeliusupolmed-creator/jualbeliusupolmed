import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSellerSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  getSellerSession: mocks.getSellerSession,
}));

import { getOpenPoSession } from "./openPoSession";

afterEach(() => {
  vi.clearAllMocks();
});

describe("Open PO seller session", () => {
  it("distinguishes an ended session from a signed-in account without a phone number", () => {
    mocks.getSellerSession.mockReturnValue(null);
    expect(getOpenPoSession()).toMatchObject({ status: 401, wa: "" });

    mocks.getSellerSession.mockReturnValue("google_account_abc123");
    expect(getOpenPoSession()).toMatchObject({ status: 403, wa: "" });
    expect(getOpenPoSession().error).toContain("Akun JB aktif");
  });

  it("normalizes a phone-based seller session", () => {
    mocks.getSellerSession.mockReturnValue("+62 812-3456-7890");
    expect(getOpenPoSession()).toMatchObject({ status: 200, wa: "081234567890", error: "" });
  });
});

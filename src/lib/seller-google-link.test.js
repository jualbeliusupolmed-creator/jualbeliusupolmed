import { afterEach, describe, expect, it } from "vitest";
import {
  createSellerGoogleLinkToken,
  isSellerGoogleLinkFlow,
  verifySellerGoogleLinkToken,
} from "./seller-google-link";

const originalSecret = process.env.SESSION_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
});

describe("seller Google-link challenge", () => {
  it("keeps Google OAuth in link mode when the callback intent exists but its cookie is missing", () => {
    const searchParams = new URLSearchParams("link_google=1");

    expect(isSellerGoogleLinkFlow(searchParams, undefined)).toBe(true);
    expect(isSellerGoogleLinkFlow(new URLSearchParams(), undefined)).toBe(false);
  });

  it("recognizes an active link cookie even if the callback query is absent", () => {
    expect(isSellerGoogleLinkFlow(new URLSearchParams(), "signed-link-token")).toBe(true);
  });

  it("binds the short-lived challenge to the signed-in phone account", () => {
    process.env.SESSION_SECRET = "test-google-link-secret";
    const token = createSellerGoogleLinkToken("081234567890");

    expect(verifySellerGoogleLinkToken(token, "081234567890")).toBe(true);
    expect(verifySellerGoogleLinkToken(token, "081234567891")).toBe(false);
    expect(verifySellerGoogleLinkToken(`${token}tampered`, "081234567890")).toBe(false);
  });

  it("rejects a challenge signed with a different key", () => {
    process.env.SESSION_SECRET = "first-test-secret";
    const token = createSellerGoogleLinkToken("081234567890");
    process.env.SESSION_SECRET = "second-test-secret";

    expect(verifySellerGoogleLinkToken(token, "081234567890")).toBe(false);
  });
});

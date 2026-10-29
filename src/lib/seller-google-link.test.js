import { afterEach, describe, expect, it } from "vitest";
import {
  createSellerGoogleLinkToken,
  verifySellerGoogleLinkToken,
} from "./seller-google-link";

const originalSecret = process.env.SESSION_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
});

describe("seller Google-link challenge", () => {
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

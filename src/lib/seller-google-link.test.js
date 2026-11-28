import { afterEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  createSellerGoogleLinkToken,
  isSellerGoogleLinkFlow,
  verifySellerGoogleLinkToken,
} from "./seller-google-link";
import { SELLER_GOOGLE_LINK_TTL } from "./seller-google-link";

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

  it("binds the short-lived challenge to the signed-in phone account", async () => {
    process.env.SESSION_SECRET = "test-google-link-secret";
    const token = await createSellerGoogleLinkToken("081234567890");

    expect(await verifySellerGoogleLinkToken(token, "081234567890")).toBe(true);
    expect(await verifySellerGoogleLinkToken(token, "081234567891")).toBe(false);
    expect(await verifySellerGoogleLinkToken(`${token}tampered`, "081234567890")).toBe(false);
  });

  it("rejects a challenge signed with a different key", async () => {
    process.env.SESSION_SECRET = "first-test-secret";
    const token = await createSellerGoogleLinkToken("081234567890");
    process.env.SESSION_SECRET = "second-test-secret";

    expect(await verifySellerGoogleLinkToken(token, "081234567890")).toBe(false);
  });

  it("accepts and emits tokens compatible with the previous HMAC format", async () => {
    const signingKey = "compatible-google-link-secret";
    process.env.SESSION_SECRET = signingKey;
    const payload = Buffer.from(JSON.stringify({
      wa: "081234567890",
      exp: Date.now() + SELLER_GOOGLE_LINK_TTL * 1000,
      nonce: "0123456789abcdef",
    })).toString("base64url");
    const legacySignature = createHmac("sha256", signingKey).update(payload).digest("base64url");

    expect(await verifySellerGoogleLinkToken(`${payload}.${legacySignature}`, "081234567890")).toBe(true);

    const token = await createSellerGoogleLinkToken("081234567890");
    const [newPayload, signature] = token.split(".");
    const expectedSignature = createHmac("sha256", signingKey).update(newPayload).digest("base64url");
    expect(signature).toBe(expectedSignature);
  });
});

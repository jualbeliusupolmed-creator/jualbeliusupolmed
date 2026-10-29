import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const cookieJar = vi.hoisted(() => ({ value: undefined, options: undefined }));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () => (cookieJar.value ? { value: cookieJar.value } : undefined),
    set: (_name, value, options) => {
      cookieJar.value = value;
      cookieJar.options = options;
    },
  }),
}));

import { getSellerSession, setSellerCookie } from "./auth";

const envKeys = ["SESSION_SECRET", "SESSION_SECRET_PREVIOUS", "ADMIN_PASSWORD"];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function tokenFor(wa, signingKey) {
  const payload = Buffer.from(
    JSON.stringify({ wa, exp: Date.now() + 60 * 60 * 1000 })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", signingKey).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

afterEach(() => {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  cookieJar.value = undefined;
  cookieJar.options = undefined;
});

describe("seller session cookie", () => {
  it("accepts legacy cookies after SESSION_SECRET is configured and can migrate them", () => {
    process.env.SESSION_SECRET = "new-dedicated-session-secret";
    process.env.ADMIN_PASSWORD = "legacy-admin-password";
    cookieJar.value = tokenFor("seller-id", process.env.ADMIN_PASSWORD);

    expect(getSellerSession()).toBe("seller-id");

    setSellerCookie("seller-id");
    const [payload, signature] = cookieJar.value.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.SESSION_SECRET)
      .update(payload)
      .digest("base64url");

    expect(signature).toBe(expectedSignature);
    expect(cookieJar.options.maxAge).toBe(60 * 60 * 24 * 30);
  });

  it("accepts the explicitly configured previous key during rotation", () => {
    process.env.SESSION_SECRET = "current-session-secret";
    process.env.SESSION_SECRET_PREVIOUS = "previous-session-secret";
    cookieJar.value = tokenFor("seller-id", process.env.SESSION_SECRET_PREVIOUS);

    expect(getSellerSession()).toBe("seller-id");
  });

  it("rejects malformed, tampered, and expired tokens", () => {
    process.env.SESSION_SECRET = "current-session-secret";
    cookieJar.value = "not-a-token";
    expect(getSellerSession()).toBeNull();

    cookieJar.value = tokenFor("seller-id", "different-secret");
    expect(getSellerSession()).toBeNull();

    const payload = Buffer.from(JSON.stringify({ wa: "seller-id", exp: Date.now() - 1 })).toString(
      "base64url"
    );
    const signature = crypto
      .createHmac("sha256", process.env.SESSION_SECRET)
      .update(payload)
      .digest("base64url");
    cookieJar.value = `${payload}.${signature}`;
    expect(getSellerSession()).toBeNull();
  });
});

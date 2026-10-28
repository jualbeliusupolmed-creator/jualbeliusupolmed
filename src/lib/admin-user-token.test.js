import { afterEach, describe, expect, it } from "vitest";
import { openAdminUserToken, sealAdminUserToken } from "./admin-user-token";

const SECRET = "test-only-admin-session-secret-with-sufficient-length";
const originalSecret = process.env.ADMIN_SESSION_SECRET;
const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = originalSecret;
  if (originalServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
});

describe("opaque admin user token", () => {
  it("roundtrips the private user identifier without exposing it in the token", () => {
    process.env.ADMIN_SESSION_SECRET = SECRET;
    const token = sealAdminUserToken("081234567890");
    expect(token).not.toContain("081234567890");
    expect(openAdminUserToken(token)).toBe("081234567890");
  });

  it("rejects tampered tokens", () => {
    process.env.ADMIN_SESSION_SECRET = SECRET;
    const token = sealAdminUserToken("081234567890");
    const changed = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(() => openAdminUserToken(changed)).toThrow();
  });

  it("uses the server-only service key as a fallback when no admin secret is configured", () => {
    delete process.env.ADMIN_SESSION_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
    const token = sealAdminUserToken("081234567890");
    expect(openAdminUserToken(token)).toBe("081234567890");
  });
});

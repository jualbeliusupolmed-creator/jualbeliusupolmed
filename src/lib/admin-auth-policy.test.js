import { describe, expect, it } from "vitest";
import { isGoogleAuthIdentity, resolveAdminLoginRole } from "./admin-auth-policy";

describe("admin Google login policy", () => {
  it("recognizes a verified Google identity without requiring a campus email domain", () => {
    expect(isGoogleAuthIdentity({ app_metadata: { provider: "google" } })).toBe(true);
    expect(isGoogleAuthIdentity({ app_metadata: { providers: ["email", "google"] } })).toBe(true);
    expect(isGoogleAuthIdentity({ identities: [{ provider: "google" }] })).toBe(true);
    expect(isGoogleAuthIdentity({ email: "owner@example.com", app_metadata: { provider: "email" } })).toBe(false);
  });

  it("grants superadmin only to the configured Auth user and owners only with active membership", () => {
    expect(resolveAdminLoginRole("ABC-123", "abc-123", false)).toBe("superadmin");
    expect(resolveAdminLoginRole("owner-456", "abc-123", true)).toBe("owner");
    expect(resolveAdminLoginRole("unassigned-789", "abc-123", false)).toBe(null);
    expect(resolveAdminLoginRole("abc-123", "", false)).toBe(null);
  });
});

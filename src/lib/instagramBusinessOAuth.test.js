import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInstagramOAuthState,
  getInstagramOAuthConfig,
  instagramOAuthResultUrl,
  verifyInstagramOAuthState,
} from "./instagramBusinessOAuth";

describe("Instagram Business Login OAuth", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates and validates a short-lived state bound to its HttpOnly cookie value", () => {
    vi.stubEnv("META_INSTAGRAM_APP_SECRET", "test-instagram-app-secret");
    const now = 1_800_000_000_000;
    const state = createInstagramOAuthState({
      accountId: "social-account-1",
      actorId: "admin-user-1",
      now,
    });

    expect(verifyInstagramOAuthState(state, state, { now })).toMatchObject({
      accountId: "social-account-1",
      actorId: "admin-user-1",
      exp: now + 10 * 60 * 1000,
    });
    expect(verifyInstagramOAuthState(state, "different-cookie", { now })).toBeNull();
    expect(verifyInstagramOAuthState(state, state, { now: now + 10 * 60 * 1000 })).toBeNull();
  });

  it("requires the exact HTTPS callback path and server credentials", () => {
    vi.stubEnv("META_INSTAGRAM_APP_ID", "123456789012345");
    vi.stubEnv("META_INSTAGRAM_APP_SECRET", "test-instagram-app-secret");
    vi.stubEnv(
      "META_INSTAGRAM_REDIRECT_URI",
      "https://kampuskita.example/api/admin/social/instagram/oauth/callback",
    );
    expect(getInstagramOAuthConfig()).toMatchObject({
      appId: "123456789012345",
      redirectUri: "https://kampuskita.example/api/admin/social/instagram/oauth/callback",
    });

    vi.stubEnv("META_INSTAGRAM_REDIRECT_URI", "https://attacker.example/callback");
    expect(() => getInstagramOAuthConfig()).toThrow("not configured");
  });

  it("builds a fixed admin return URL with a bounded result marker", () => {
    const result = instagramOAuthResultUrl("https://kampuskita.example", "success");
    expect(result.origin).toBe("https://kampuskita.example");
    expect(result.pathname).toBe("/admin/social");
    expect(result.searchParams.get("instagram_oauth")).toBe("success");
  });
});

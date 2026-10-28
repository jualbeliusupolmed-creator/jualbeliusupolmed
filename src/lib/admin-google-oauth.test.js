import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_GOOGLE_FLOW_COOKIE,
  ADMIN_GOOGLE_FLOW_PATH,
  ADMIN_GOOGLE_FLOW_TTL,
  createAdminGoogleAuthClient,
  getAdminGoogleVerifierCookieName,
} from "./admin-google-oauth";

afterEach(() => vi.unstubAllEnvs());

describe("server-side Google OAuth for admin", () => {
  it("builds a PKCE Google URL and stores only the short-lived verifier", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project-ref.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
    const cookies = [];
    const adapter = {
      get: vi.fn(() => null),
      set: vi.fn((name, value) => cookies.push({ name, value })),
      remove: vi.fn(),
    };
    const supabase = createAdminGoogleAuthClient(adapter);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://jual-beli.example/auth/callback",
        skipBrowserRedirect: true,
      },
    });

    expect(error).toBeNull();
    expect(data.url).toContain("provider=google");
    expect(data.url).toContain("code_challenge_method=s256");
    expect(data.url).toContain(encodeURIComponent("https://jual-beli.example/auth/callback"));
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("sb-project-ref-auth-token-code-verifier");
    const storedValue = Buffer.from(cookies[0].value, "base64url").toString("utf8");
    expect(JSON.parse(storedValue)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(adapter.get).not.toHaveBeenCalled();
  });

  it("scopes the OAuth marker and verifier to the callback for ten minutes", () => {
    expect(ADMIN_GOOGLE_FLOW_COOKIE).toBe("admin_google_oauth_flow");
    expect(ADMIN_GOOGLE_FLOW_PATH).toBe("/auth/callback");
    expect(ADMIN_GOOGLE_FLOW_TTL).toBe(600);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project-ref.supabase.co");
    expect(getAdminGoogleVerifierCookieName()).toBe("sb-project-ref-auth-token-code-verifier");
  });
});

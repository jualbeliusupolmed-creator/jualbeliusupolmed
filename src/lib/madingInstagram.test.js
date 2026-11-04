import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminClient: vi.fn(),
  getInstagramAccountCredentials: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({ getAdminClient: mocks.getAdminClient }));
vi.mock("@/lib/instagramAccountCredentials", () => ({
  getInstagramAccountCredentials: mocks.getInstagramAccountCredentials,
}));

describe("Mading Instagram account selection", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("META_MENFESS_IG_ACCESS_TOKEN", "");
    vi.stubEnv("META_MENFESS_IG_USER_ID", "");
    vi.stubEnv("META_IG_ACCESS_TOKEN", "");
    vi.stubEnv("META_IG_USER_ID", "");
    mocks.getInstagramAccountCredentials.mockReset();
  });

  it("uses the explicitly selected encrypted Instagram Login account", async () => {
    const account = {
      id: "mading-ig-account",
      provider: "instagram",
      external_account_id: "17841400000000001",
    };
    const selectedAccountQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: account, error: null }),
    };
    const settingsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { value: { instagramAccountId: account.id } },
        error: null,
      }),
    };
    mocks.getAdminClient.mockReturnValue({
      from: (table) => table === "settings" ? settingsQuery : selectedAccountQuery,
    });
    mocks.getInstagramAccountCredentials.mockResolvedValue({
      token: "encrypted-oauth-token",
      apiBase: "https://graph.instagram.com",
    });

    const { resolveMadingInstagramCredentials } = await import("./madingInstagram");
    const result = await resolveMadingInstagramCredentials();

    expect(result).toEqual({
      userId: account.external_account_id,
      accessToken: "encrypted-oauth-token",
      apiBase: "https://graph.instagram.com",
    });
    expect(mocks.getInstagramAccountCredentials).toHaveBeenCalledWith(expect.anything(), account);
  });

  it("retains the legacy Meta environment configuration when no account is selected", async () => {
    vi.stubEnv("META_MENFESS_IG_ACCESS_TOKEN", "legacy-token");
    vi.stubEnv("META_MENFESS_IG_USER_ID", "17841400000000002");
    const settingsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mocks.getAdminClient.mockReturnValue({ from: () => settingsQuery });

    const { resolveMadingInstagramCredentials } = await import("./madingInstagram");

    await expect(resolveMadingInstagramCredentials()).resolves.toEqual({
      userId: "17841400000000002",
      accessToken: "legacy-token",
      apiBase: "https://graph.facebook.com",
    });
  });
});

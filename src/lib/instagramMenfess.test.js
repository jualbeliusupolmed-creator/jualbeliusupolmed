import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  rateLimitDistributed: vi.fn(),
  sendInstagramText: vi.fn(),
  autoPublishMadingInstagram: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({ getSettings: mocks.getSettings }));
vi.mock("@/lib/rateLimit", () => ({ rateLimitDistributed: mocks.rateLimitDistributed }));
vi.mock("@/lib/instagramDm", () => ({ sendInstagramText: mocks.sendInstagramText }));
vi.mock("@/lib/madingInstagram", () => ({ autoPublishMadingInstagram: mocks.autoPublishMadingInstagram }));
vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: () => ({
    from: () => ({
      insert: mocks.insert,
    }),
  }),
}));
vi.mock("@/lib/profanity", () => ({
  detectDoxxingRisk: () => ({ risky: false }),
  censorProfanity: (value) => value,
}));
vi.mock("@/lib/moderationRules", () => ({
  evaluateModerationRules: () => ({ action: "approve", riskScore: 0 }),
}));
vi.mock("@/lib/identitasHash", () => ({ hashIdentitas: () => "redacted-hash" }));

describe("Instagram DM Menfess", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(async () => {
    vi.resetModules();
    mocks.getSettings.mockReset();
    mocks.rateLimitDistributed.mockReset().mockResolvedValue({ ok: true });
    mocks.sendInstagramText.mockReset().mockResolvedValue({ ok: true });
    mocks.autoPublishMadingInstagram.mockReset().mockResolvedValue({ ok: true });
    mocks.insert.mockReset().mockImplementation(() => ({
      select: () => ({
        single: async () => ({ data: { id: "post-1" }, error: null }),
      }),
    }));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "");
  });

  it("uses safe defaults when DM configuration is empty or malformed", async () => {
    const { getInstagramMenfessConfig } = await import("./instagramMenfess");
    const config = getInstagramMenfessConfig({
      mading: { instagramDmTriggers: [], instagramDmMinChars: -1 },
    });

    expect(config.triggers).toEqual(["menfess", "curhat"]);
    expect(config.minChars).toBe(5);
    expect(config.enabled).toBe(false);
  });

  it("parses configured triggers and blocks whole-word matches", async () => {
    const { parseInstagramMenfessSubmission, hasConfiguredBlockedWord } = await import("./instagramMenfess");

    expect(parseInstagramMenfessSubmission("Curhat: capek kuliah", ["curhat"])).toMatchObject({
      matched: true,
      trigger: "curhat",
      content: "capek kuliah",
    });
    expect(hasConfiguredBlockedWord("bagus banget", ["bagus"])).toBe(true);
    expect(hasConfiguredBlockedWord("bagusan", ["bagus"])).toBe(false);
  });

  it("stores an anonymous post, queues publication, and replies on its receiving account", async () => {
    mocks.getSettings.mockResolvedValue({
      mading: {
        instagramDmEnabled: true,
        instagramDmTriggers: ["menfess"],
        instagramDmMinChars: 5,
        instagramDmMaxChars: 1000,
      },
    });
    const { handleInstagramMenfess } = await import("./instagramMenfess");

    const result = await handleInstagramMenfess({
      senderId: "private-sender-id",
      recipientId: "17841400000000001",
      text: "menfess: semangat ujian semuanya",
    });

    expect(result).toMatchObject({ handled: true, action: "menfess_created", postId: "post-1" });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      sender_name: "Anonim",
      content: "semangat ujian semuanya",
      author_ip_hash: "redacted-hash",
    }));
    expect(mocks.autoPublishMadingInstagram).toHaveBeenCalledWith(expect.objectContaining({
      postId: "post-1",
      timeoutMs: 0,
    }));
    expect(mocks.sendInstagramText).toHaveBeenCalledWith(
      "private-sender-id",
      expect.stringContaining("/mading#post-post-1"),
      { accountId: "17841400000000001" },
    );
  });
});

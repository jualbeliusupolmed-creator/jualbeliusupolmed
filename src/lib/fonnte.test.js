import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminClient: vi.fn(),
  tokenBotUtama: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("@/lib/botTokens", () => ({
  tokenBotUtama: mocks.tokenBotUtama,
}));

import { sendWa } from "./fonnte";

describe("sendWa WhatsApp gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tokenBotUtama.mockReturnValue("test-bot-token");
    mocks.getAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null })),
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the Baileys bot and redacts short-lived message content from chat history", async () => {
    vi.stubEnv("BAILEYS_API_URL", "https://bot.example/send");
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ queued: true }),
    });
    vi.stubGlobal("fetch", fetch);
    const inserted = [];
    mocks.getAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn((record) => {
          inserted.push(record);
          return Promise.resolve({ error: null });
        }),
      })),
    });

    const result = await sendWa("08123456789", "OTP rahasia 482915", null, 300);

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://bot.example/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "test-bot-token" }),
      })
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body).message).toContain("482915");
    expect(inserted[0].message).toBe("[konten pesan berumur pendek dirahasiakan]");
    expect(inserted[0].message).not.toContain("482915");
  });

  it("returns a specific configuration error instead of silently skipping delivery", async () => {
    vi.stubEnv("BAILEYS_API_URL", "");
    vi.stubEnv("FONNTE_TOKEN", "unused-fallback-token");
    mocks.tokenBotUtama.mockReturnValue("");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const result = await sendWa("08123456789", "OTP rahasia 482915", null, 300);

    expect(result).toMatchObject({
      ok: false,
      code: "gateway_not_configured",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

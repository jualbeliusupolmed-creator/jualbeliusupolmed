import { describe, expect, it, vi } from "vitest";
import {
  loadConversationMemory,
  mergeConversationHistory,
  sanitizeMemoryText,
} from "@/lib/botMemory";
import { aiActionNeedsClarification, isFastPathCommand } from "@/lib/botIntent";

describe("bot memory", () => {
  it("redacts contact data and authentication secrets before AI use", () => {
    expect(sanitizeMemoryText("hubungi 081234567890 lewat https://contoh.id/a"))
      .toBe("hubungi [nomor disensor] lewat [tautan disensor]");
    expect(sanitizeMemoryText("OTP saya 123456")).toBe("[pesan sensitif disensor]");
  });

  it("merges persistent and live history without duplicating their overlap", () => {
    const persistent = [
      { role: "user", message: "cari laptop" },
      { role: "bot", message: "budget berapa?" },
    ];
    const live = [
      { role: "bot", text: "budget berapa?" },
      { role: "user", text: "5 juta" },
    ];

    expect(mergeConversationHistory(persistent, live)).toEqual([
      { role: "user", text: "cari laptop" },
      { role: "bot", text: "budget berapa?" },
      { role: "user", text: "5 juta" },
    ]);
  });

  it("loads only bounded, older conversation rows and returns chronological memory", async () => {
    const rows = [
      { role: "bot", message: "kedua", created_at: "2026-09-01T00:02:00Z" },
      { role: "user", message: "pertama", created_at: "2026-09-01T00:01:00Z" },
    ];
    const terminal = Promise.resolve({ data: rows, error: null });
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      lt: vi.fn(() => terminal),
    };
    const supa = { from: vi.fn(() => chain) };

    const result = await loadConversationMemory(supa, "0812", {
      before: "2026-09-01T00:03:00Z",
      now: Date.parse("2026-09-02T00:00:00Z"),
    });

    expect(supa.from).toHaveBeenCalledWith("wa_conversations");
    expect(chain.eq).toHaveBeenCalledWith("wa", "0812");
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.lt).toHaveBeenCalledWith("created_at", "2026-09-01T00:03:00Z");
    expect(result).toEqual([
      { role: "user", text: "pertama" },
      { role: "bot", text: "kedua" },
    ]);
  });
});

describe("bot intent guard", () => {
  it("keeps explicit commands on the deterministic fast path", () => {
    expect(isFastPathCommand("MENU")).toBe(true);
    expect(isFastPathCommand("cari laptop bekas")).toBe(true);
    expect(isFastPathCommand("daftar pantau")).toBe(true);
    expect(isFastPathCommand("carikan laptop dong")).toBe(false);
  });

  it("requires clarification only for low-confidence action intents", () => {
    expect(aiActionNeedsClarification("search", 0.4)).toBe(true);
    expect(aiActionNeedsClarification("search", 0.9)).toBe(false);
    expect(aiActionNeedsClarification("chat", 0.1)).toBe(false);
  });
});

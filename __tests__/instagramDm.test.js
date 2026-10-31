import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseInstagramPrice, handleInstagramDmEvent } from "@/lib/instagramDmRouter";
import { verifyMetaSignature } from "@/lib/instagramDm";
import * as dmApi from "@/lib/instagramDm";
import * as dmSession from "@/lib/instagramDmSession";

// Mock Supabase
vi.mock("@/lib/supabaseAdmin", () => {
  const dummyListing = {
    id: "test-listing-123",
    title: "Kalkulator Casio",
    price: 180000,
    seller_wa: "6281234567890",
    status: "active",
  };
  const dummyPost = {
    id: "test-post-456",
    content: "Curhat ujian susah",
    status: "approved",
  };

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data: [dummyListing], error: null })),
    insert: vi.fn((data) => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: data.title ? { ...dummyListing, ...data } : { ...dummyPost, ...data },
          error: null,
        })),
      })),
    })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return {
    getAdminClient: vi.fn(() => ({
      from: vi.fn(() => chain),
    })),
  };
});

// Mock Fonnte & Instagram auto publish
vi.mock("@/lib/fonnte", () => ({
  postToGroup: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("@/lib/listingInstagram", () => ({
  autoPublishListingInstagram: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("@/lib/webpush", () => ({
  pushListingBaru: vi.fn(() => Promise.resolve({ ok: true })),
}));

describe("Instagram DM - Price Parser", () => {
  it("correctly parses shorthand thousand prices (rb/k)", () => {
    expect(parseInstagramPrice("180rb")).toBe(180000);
    expect(parseInstagramPrice("50k")).toBe(50000);
    expect(parseInstagramPrice("25 ribu")).toBe(25000);
  });

  it("correctly parses millions (jt/juta)", () => {
    expect(parseInstagramPrice("1,5jt")).toBe(1500000);
    expect(parseInstagramPrice("1.5jt")).toBe(1500000);
    expect(parseInstagramPrice("2 juta")).toBe(2000000);
  });

  it("handles standard digit formatting with periods and typing errors", () => {
    expect(parseInstagramPrice("180.000")).toBe(180000);
    expect(parseInstagramPrice("50000")).toBe(50000);
    // User types 180 meant as 180000
    expect(parseInstagramPrice("180")).toBe(180000);
  });

  it("returns 0 for empty or invalid inputs", () => {
    expect(parseInstagramPrice("")).toBe(0);
    expect(parseInstagramPrice("gratis")).toBe(0);
  });
});

describe("Instagram DM - Signature Verification", () => {
  it("verifies sha256 signature correctly", () => {
    const crypto = require("crypto");
    const secret = "test_app_secret";
    const body = JSON.stringify({ object: "instagram" });
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const header = `sha256=${hmac}`;

    expect(verifyMetaSignature(body, header, secret)).toBe(true);
    expect(verifyMetaSignature(body, "sha256=invalid", secret)).toBe(false);
  });
});

describe("Instagram DM - Conversational Router", () => {
  const senderId = "test_user_ig_123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dmApi, "sendInstagramQuickReplies").mockImplementation(() => Promise.resolve({ ok: true }));
    vi.spyOn(dmApi, "sendInstagramText").mockImplementation(() => Promise.resolve({ ok: true }));
  });

  it("sends welcome menu when receiving initial greeting", async () => {
    await dmSession.clearDmSession(senderId);
    const result = await handleInstagramDmEvent({
      senderId,
      text: "halo min",
    });

    expect(result.ok).toBe(true);
    expect(result.action).toBe("sent_menu");
    expect(dmApi.sendInstagramQuickReplies).toHaveBeenCalledWith(
      senderId,
      expect.stringContaining("Halo kak!"),
      expect.arrayContaining([
        expect.objectContaining({ title: "🛍️ Jual Barang" }),
        expect.objectContaining({ title: "💬 Kirim Menfess" }),
      ])
    );
  });

  it("initiates Jual Barang flow when typing jual", async () => {
    await dmSession.clearDmSession(senderId);
    const result = await handleInstagramDmEvent({
      senderId,
      text: "jual",
    });

    expect(result.ok).toBe(true);
    expect(result.flow).toBe("jual");
    expect(result.step).toBe("jual_ask_photo");
    expect(dmApi.sendInstagramQuickReplies).toHaveBeenCalledWith(
      senderId,
      expect.stringContaining("Mulai Pasang Iklan"),
      expect.arrayContaining([expect.objectContaining({ title: "⏩ Lewati, tanpa foto" })])
    );
  });

  it("walks through Jual Barang flow and completes publication", async () => {
    await dmSession.clearDmSession(senderId);

    // 1. Mulai jual
    await handleInstagramDmEvent({ senderId, text: "jual" });

    // 2. Skip foto
    const step1 = await handleInstagramDmEvent({ senderId, text: "skip" });
    expect(step1.step).toBe("jual_ask_title");

    // 3. Masukkan judul
    const step2 = await handleInstagramDmEvent({ senderId, text: "Kalkulator Casio fx-991EX" });
    expect(step2.step).toBe("jual_ask_price");

    // 4. Masukkan harga
    const step3 = await handleInstagramDmEvent({ senderId, text: "180rb" });
    expect(step3.step).toBe("jual_ask_desc");

    // 5. Masukkan deskripsi
    const step4 = await handleInstagramDmEvent({ senderId, text: "Masih mulus, tombol empuk, COD di Pendopo" });
    expect(step4.step).toBe("jual_ask_wa");

    // 6. Masukkan nomor WhatsApp
    const step5 = await handleInstagramDmEvent({ senderId, text: "081234567890" });
    expect(step5.step).toBe("jual_confirm");

    // 7. Konfirmasi tayang
    const step6 = await handleInstagramDmEvent({ senderId, quickReplyPayload: "ACTION_CONFIRM_PUBLISH" });
    expect(step6.ok).toBe(true);
    expect(step6.action).toBe("published");
  });

  it("walks through Menfess flow matching the user screenshot", async () => {
    await dmSession.clearDmSession(senderId);

    // 1. Mulai kirim menfess
    const step1 = await handleInstagramDmEvent({
      senderId,
      text: "menfess Halo kak tolong di share ada yg punya info kos dekat pintu 1?",
    });

    expect(step1.flow).toBe("menfess");
    expect(step1.step).toBe("menfess_ask_photo");
    // Verifikasi pesan petunjuk foto persis seperti tangkapan layar pengguna
    expect(dmApi.sendInstagramQuickReplies).toHaveBeenCalledWith(
      senderId,
      expect.stringContaining("📷 Selanjutnya, kirim foto untuk menfess kamu"),
      expect.arrayContaining([
        expect.objectContaining({ title: "⏩ Skip, tanpa gambar" }),
        expect.objectContaining({ title: "❌ Batal" }),
      ])
    );

    // 2. Skip foto dan terbit
    const step2 = await handleInstagramDmEvent({
      senderId,
      quickReplyPayload: "ACTION_SKIP_PHOTO",
    });

    expect(step2.ok).toBe(true);
    expect(step2.action).toBe("menfess_published");
  });

  it("handles cancellation gracefully", async () => {
    await dmSession.clearDmSession(senderId);
    await handleInstagramDmEvent({ senderId, text: "jual" });

    const cancelResult = await handleInstagramDmEvent({
      senderId,
      text: "batal",
    });

    expect(cancelResult.ok).toBe(true);
    expect(cancelResult.action).toBe("cancelled");
  });
});


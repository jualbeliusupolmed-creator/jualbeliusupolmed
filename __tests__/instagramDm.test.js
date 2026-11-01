import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseInstagramPrice, handleInstagramDmEvent } from "@/lib/instagramDmRouter";
import { verifyMetaSignature } from "@/lib/instagramDm";
import { createLinkChallenge, verifyLinkChallenge, getLinkedSeller, hashOtp } from "@/lib/instagramDmAuth";
import * as dmApi from "@/lib/instagramDm";
import * as dmSession from "@/lib/instagramDmSession";
import { GET as webhookGet, POST as webhookPost } from "@/app/api/webhook/instagram/route";

// Intelligent In-Memory Mock Supabase
const mockTables = {
  listings: [],
  ig_seller_links: [],
  ig_link_challenges: [],
  seller_profiles: [],
  system_settings: [],
};

// OTP unit tests must never call the live WhatsApp bridge.
vi.mock("@/lib/fonnte", () => ({
  sendWa: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/supabaseAdmin", () => {
  return {
    getAdminClient: vi.fn(() => ({
      from: (tableName) => {
        const table = mockTables[tableName] || [];
        let filters = [];
        let selectedFields = "*";
        let countHead = false;

        const chain = {
          select: vi.fn((fields = "*", options = {}) => {
            selectedFields = fields;
            countHead = !!options.head;
            return chain;
          }),
          eq: vi.fn((col, val) => {
            filters.push((row) => row[col] === val);
            return chain;
          }),
          or: vi.fn((expression) => {
            const alternatives = [...String(expression).matchAll(/(wa|phone_wa)\.eq\.([^,]+)/g)];
            if (alternatives.length) {
              filters.push((row) => alternatives.some(([, column, value]) => String(row[column] || "") === value));
            }
            return chain;
          }),
          in: vi.fn((col, values) => {
            filters.push((row) => values.includes(row[col]));
            return chain;
          }),
          gte: vi.fn(() => chain),
          ilike: vi.fn((col, pattern) => {
            const clean = pattern.replace(/%/g, "").toLowerCase();
            filters.push((row) => String(row[col] || "").toLowerCase().includes(clean));
            return chain;
          }),
          order: vi.fn(() => chain),
          limit: vi.fn((n) => {
            const res = table.filter((r) => filters.every((f) => f(r))).slice(0, n);
            return Promise.resolve({ data: res, error: null });
          }),
          then: (resolve, reject) => {
            const rows = table.filter((row) => filters.every((filter) => filter(row)));
            const result = countHead
              ? { count: rows.length, error: null }
              : { data: rows, error: null };
            return Promise.resolve(result).then(resolve, reject);
          },
          maybeSingle: vi.fn(() => {
            const res = table.find((r) => filters.every((f) => f(r)));
            return Promise.resolve({ data: res || null, error: null });
          }),
          single: vi.fn(() => {
            const res = table.find((r) => filters.every((f) => f(r)));
            return Promise.resolve({ data: res || table[table.length - 1] || null, error: null });
          }),
          insert: vi.fn((data) => {
            const row = { id: `id-${Date.now()}-${Math.random()}`, created_at: new Date().toISOString(), ...(Array.isArray(data) ? data[0] : data) };
            table.push(row);
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: row, error: null })),
              })),
              data: row,
              error: null,
            };
          }),
          update: vi.fn((data) => {
            const updateFilters = [];
            let result;
            const apply = () => {
              if (result) return result;
              const targets = table.filter((row) => updateFilters.every((filter) => filter(row)));
              targets.forEach((row) => Object.assign(row, data));
              result = { data: targets[0] || null, error: null };
              return result;
            };
            const updater = {
              eq: vi.fn((col, val) => { updateFilters.push((row) => row[col] === val); return updater; }),
              select: vi.fn(() => updater),
              maybeSingle: vi.fn(() => Promise.resolve(apply())),
              then: (resolve, reject) => Promise.resolve(apply()).then(resolve, reject),
            };
            return updater;
          }),
          upsert: vi.fn((data, opts = {}) => {
            const conflictCol = opts.onConflict || "id";
            const row = Array.isArray(data) ? data[0] : data;
            const idx = table.findIndex((r) => r[conflictCol] === row[conflictCol]);
            if (idx >= 0) {
              Object.assign(table[idx], row);
            } else {
              table.push({ id: `id-${Date.now()}`, ...row });
            }
            return Promise.resolve({ data: row, error: null });
          }),
          delete: vi.fn(() => {
            const deleteFilters = [];
            let result;
            const apply = () => {
              if (result) return result;
              for (let i = table.length - 1; i >= 0; i--) {
                if (deleteFilters.every((filter) => filter(table[i]))) table.splice(i, 1);
              }
              result = { data: null, error: null };
              return result;
            };
            const deleter = {
              eq: vi.fn((col, val) => { deleteFilters.push((row) => row[col] === val); return deleter; }),
              then: (resolve, reject) => Promise.resolve(apply()).then(resolve, reject),
            };
            return deleter;
          }),
        };

        return chain;
      },
    })),
  };
});

// Mock Fonnte & Webpush
vi.mock("@/lib/fonnte", () => ({
  sendWa: vi.fn(() => Promise.resolve({ ok: true })),
  postToGroup: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("@/lib/listingInstagram", () => ({
  autoPublishListingInstagram: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("@/lib/webpush", () => ({
  pushListingBaru: vi.fn(() => Promise.resolve({ ok: true })),
}));

describe("Tahap 4 - Price Parser", () => {
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
    expect(parseInstagramPrice("180")).toBe(180000);
  });

  it("returns 0 for empty or invalid inputs", () => {
    expect(parseInstagramPrice("")).toBe(0);
    expect(parseInstagramPrice("gratis")).toBe(0);
  });
});

describe("Tahap 0 - Webhook Security & Idempotency", () => {
  const secret = "test_meta_app_secret";
  const verifyToken = "test_verify_token_123";

  it("verifies sha256 signature correctly", () => {
    const crypto = require("crypto");
    const body = JSON.stringify({ object: "instagram" });
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const header = `sha256=${hmac}`;

    expect(verifyMetaSignature(body, header, secret)).toBe(true);
    expect(verifyMetaSignature(body, "sha256=invalid", secret)).toBe(false);
  });

  it("GET rejects missing or incorrect verify token", async () => {
    const oldToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    process.env.META_WEBHOOK_VERIFY_TOKEN = verifyToken;

    // Token salah
    const reqWrong = new Request(`https://test.com/api/webhook/instagram?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`);
    const resWrong = await webhookGet(reqWrong);
    expect(resWrong.status).toBe(403);

    // Token benar
    const reqValid = new Request(`https://test.com/api/webhook/instagram?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=12345`);
    const resValid = await webhookGet(reqValid);
    expect(resValid.status).toBe(200);
    expect(await resValid.text()).toBe("12345");

    process.env.META_WEBHOOK_VERIFY_TOKEN = oldToken;
  });

  it("POST rejects missing secret or missing/invalid signature", async () => {
    const oldSecret = process.env.META_APP_SECRET;
    delete process.env.META_APP_SECRET;

    // Secret belum dikonfigurasi
    const reqNoSecret = new Request("https://test.com/api/webhook/instagram", {
      method: "POST",
      body: JSON.stringify({ object: "instagram" }),
    });
    const resNoSecret = await webhookPost(reqNoSecret);
    expect(resNoSecret.status).toBe(503);

    // Set secret, tapi signature salah
    process.env.META_APP_SECRET = secret;
    const reqInvalidSig = new Request("https://test.com/api/webhook/instagram", {
      method: "POST",
      headers: { "x-hub-signature-256": "sha256=bad" },
      body: JSON.stringify({ object: "instagram" }),
    });
    const resInvalidSig = await webhookPost(reqInvalidSig);
    expect(resInvalidSig.status).toBe(401);

    process.env.META_APP_SECRET = oldSecret;
  });
});

describe("Tahap 2 - Penautan Akun WhatsApp & Instagram (OTP)", () => {
  const igSenderId = "ig_user_test_999";
  const sellerWa = "081234567899";

  it("creates challenge and verifies OTP successfully", async () => {
    mockTables.seller_profiles.push({ wa: sellerWa, phone_wa: null, name: "Tester" });
    // 1. Buat tantangan
    const challenge = await createLinkChallenge({ igSenderId, wa: sellerWa, campus: "USU / POLMED" });
    expect(challenge.ok).toBe(true);
    expect(challenge.wa).toBe("081234567899");
    const otp = challenge._debugOtp;
    expect(otp).toBeDefined();

    // 2. Coba verifikasi dengan OTP salah
    const failVerif = await verifyLinkChallenge({ wa: sellerWa, otpInput: "000000", igSenderId });
    expect(failVerif.ok).toBe(false);
    expect(failVerif.message).toContain("salah");

    // 3. Verifikasi dengan OTP benar
    const successVerif = await verifyLinkChallenge({ wa: sellerWa, otpInput: otp, igSenderId });
    expect(successVerif.ok).toBe(true);
    expect(successVerif.wa).toBe("081234567899");

    // 4. Periksa getLinkedSeller
    const linked = await getLinkedSeller(igSenderId);
    expect(linked.linked).toBe(true);
    expect(linked.wa).toBe("081234567899");
  });
});

describe("Tahap 1 & 3 - Conversational Router & Pipeline Moderasi", () => {
  const senderId = "test_user_ig_router_123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dmApi, "sendInstagramQuickReplies").mockImplementation(() => Promise.resolve({ ok: true }));
    vi.spyOn(dmApi, "sendInstagramText").mockImplementation(() => Promise.resolve({ ok: true }));
  });

  it("sends welcome menu focused on Jual Barang", async () => {
    await dmSession.clearDmSession(senderId);
    const result = await handleInstagramDmEvent({
      senderId,
      text: "halo min",
    });

    expect(result.ok).toBe(true);
    expect(result.action).toBe("sent_menu");
    expect(dmApi.sendInstagramQuickReplies).toHaveBeenCalledWith(
      senderId,
      expect.stringContaining("asisten resmi"),
      expect.arrayContaining([
        expect.objectContaining({ title: "🛍️ Jual Barang" }),
        expect.objectContaining({ title: "🛡️ Panduan COD" }),
      ])
    );
  });

  it("politely redirects Menfess and Cari queries to Web / WA bot (Tahap 1 Gate)", async () => {
    await dmSession.clearDmSession(senderId);
    const resultMenfess = await handleInstagramDmEvent({
      senderId,
      text: "menfess tolong share min",
    });
    expect(resultMenfess.ok).toBe(true);
    expect(resultMenfess.action).toBe("feature_redirected");

    const resultCari = await handleInstagramDmEvent({
      senderId,
      text: "cari laptop bekas",
    });
    expect(resultCari.ok).toBe(true);
    expect(resultCari.action).toBe("feature_redirected");
  });

  it("prompts for WhatsApp number when unlinked user initiates Jual", async () => {
    await dmSession.clearDmSession(senderId);
    const result = await handleInstagramDmEvent({
      senderId,
      text: "jual",
    });

    expect(result.ok).toBe(true);
    expect(result.flow).toBe("jual");
    expect(result.step).toBe("jual_ask_wa");
    expect(dmApi.sendInstagramQuickReplies).toHaveBeenCalledWith(
      senderId,
      expect.stringContaining("Nomor WhatsApp"),
      expect.any(Array)
    );
  });

  it("walks through complete Jual flow from unlinked to OTP, details, and review submission", async () => {
    const freshSender = "fresh_user_ig_" + Date.now();
    mockTables.seller_profiles.push({ wa: "081234567888", phone_wa: null, name: "Tester DM" });
    await dmSession.clearDmSession(freshSender);

    // 1. Mulai jual
    await handleInstagramDmEvent({ senderId: freshSender, text: "jual" });

    // 2. Masukkan nomor WhatsApp
    const stepWa = await handleInstagramDmEvent({ senderId: freshSender, text: "081234567888" });
    expect(stepWa.step).toBe("jual_ask_otp");

    // Ambil tantangan OTP yang baru saja dibuat
    const latestChallenge = mockTables.ig_link_challenges.find((c) => c.ig_sender_id === freshSender && c.status === "pending");
    expect(latestChallenge).toBeDefined();

    // Verifikasi OTP langsung lewat helper
    const verif = await verifyLinkChallenge({ wa: "081234567888", otpInput: "999999", igSenderId: freshSender }); // coba salah
    expect(verif.ok).toBe(false);

    // Verifikasi lewat balasan WA bot yang mensimulasikan VERIF <kode>
    // Kita gunakan input OTP yang sesuai
    const testOtp = "123456";
    latestChallenge.otp_hash = hashOtp(testOtp);

    // 3. Masukkan OTP di DM -> lanjut ke atur kata sandi akun
    const stepOtp = await handleInstagramDmEvent({ senderId: freshSender, text: testOtp });
    expect(stepOtp.ok).toBe(true);
    expect(stepOtp.step).toBe("jual_set_password");

    // 3B. Atur kata sandi di DM
    const stepPassword = await handleInstagramDmEvent({ senderId: freshSender, text: "sandiAman123" });
    expect(stepPassword.ok).toBe(true);
    expect(stepPassword.step).toBe("jual_ask_photo");

    // 4. Skip foto
    const stepPhoto = await handleInstagramDmEvent({ senderId: freshSender, text: "skip" });
    expect(stepPhoto.step).toBe("jual_ask_title");

    // 5. Masukkan judul
    const stepTitle = await handleInstagramDmEvent({ senderId: freshSender, text: "Kalkulator Ilmiah Casio" });
    expect(stepTitle.step).toBe("jual_ask_category");

    // 6. Pilih kategori
    const stepCategory = await handleInstagramDmEvent({ senderId: freshSender, quickReplyPayload: "CATEGORY_ELEKTRONIK" });
    expect(stepCategory.step).toBe("jual_ask_price");

    // 7. Masukkan harga
    const stepPrice = await handleInstagramDmEvent({ senderId: freshSender, text: "150rb" });
    expect(stepPrice.step).toBe("jual_ask_desc");

    // 8. Masukkan deskripsi
    const stepDesc = await handleInstagramDmEvent({ senderId: freshSender, text: "Mulus, COD di Pintu 2" });
    expect(stepDesc.step).toBe("jual_confirm");

    // 9. Konfirmasi tayang
    const stepConfirm = await handleInstagramDmEvent({ senderId: freshSender, quickReplyPayload: "ACTION_CONFIRM_PUBLISH" });
    expect(stepConfirm.ok).toBe(true);
    expect(stepConfirm.action).toBe("submitted_for_review");
  });

  it("blocks prohibited item (e.g. vape/pod/joki) during Jual flow", async () => {
    const sender = "prohibited_tester_" + Date.now();
    await dmSession.clearDmSession(sender);

    // Link seller terlebih dahulu di mock database
    mockTables.ig_seller_links.push({
      ig_sender_id: sender,
      wa: "081299998888",
      campus: "USU / POLMED",
    });
    mockTables.seller_profiles.push({
      wa: "081299998888",
      name: "Tester Prohibited",
    });

    // Mulai jual
    const stepStart = await handleInstagramDmEvent({ senderId: sender, text: "jual" });
    expect(stepStart.step).toBe("jual_ask_photo");

    // Lewati foto
    const stepPhoto = await handleInstagramDmEvent({ senderId: sender, text: "skip" });
    expect(stepPhoto.step).toBe("jual_ask_title");

    // Coba masukkan judul terlarang
    const stepBad = await handleInstagramDmEvent({ senderId: sender, text: "Pod Caliburn Koko Mulus Liquid Murah" });
    expect(stepBad.ok).toBe(false);
    expect(stepBad.error).toBe("prohibited_item");
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

  it("supports setting and changing password directly via Instagram DM", async () => {
    const pwSender = "user_pw_test_" + Date.now();
    await dmSession.clearDmSession(pwSender);

    mockTables.ig_seller_links.push({
      ig_sender_id: pwSender,
      wa: "081299997777",
      campus: "USU / POLMED",
    });
    mockTables.seller_profiles.push({
      wa: "081299997777",
      name: "Tester Password",
      pin: null,
    });

    // 1. Ketik 'ganti password'
    const stepChange = await handleInstagramDmEvent({ senderId: pwSender, text: "ganti password" });
    expect(stepChange.ok).toBe(true);
    expect(stepChange.step).toBe("jual_set_password");

    // 2. Ketik password terlalu pendek (< 6 karakter)
    const stepShort = await handleInstagramDmEvent({ senderId: pwSender, text: "123" });
    expect(stepShort.ok).toBe(false);
    expect(stepShort.error).toBe("password_too_short");

    // 3. Ketik password valid (>= 6 karakter)
    const stepValid = await handleInstagramDmEvent({ senderId: pwSender, text: "kampuskita2026" });
    expect(stepValid.ok).toBe(true);
    expect(stepValid.step).toBe("jual_ask_photo");
  });
});

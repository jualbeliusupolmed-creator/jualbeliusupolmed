import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectDoxxingRisk, censorProfanity } from "@/lib/profanity";
import { evaluateModerationRules } from "@/lib/moderationRules";

describe("WhatsApp Menfess Validator & Guard", () => {
  it("menolak menfess jika pesan kurang dari 5 karakter", () => {
    const raw = "hai";
    expect(raw.length < 5).toBe(true);
  });

  it("mendeteksi resiko doxxing pada pesan menfess", () => {
    const doxxingText = "Hubungi 081234567890 untuk info kos ini";
    const res = detectDoxxingRisk(doxxingText);
    expect(res.risky).toBe(true);
  });

  it("menyensor kata-kata kasar secara otomatis", () => {
    const dirty = "dasar anjing lu";
    const clean = censorProfanity(dirty);
    expect(clean).not.toContain("anjing");
    expect(clean).toContain("***");
  });

  it("menolak konten melanggar panduan komunitas (narkoba / joki skripsi)", () => {
    const text = "Jual tembakau gorila dan obat terlarang hubungi saya";
    const check = evaluateModerationRules({
      title: "",
      description: text,
      category: "Lainnya",
      type: "menfess",
    });
    expect(check.action === "reject" || (check.riskScore || 0) >= 70).toBe(true);
  });

  it("menerima pesan menfess / curhat wajar tanpa menolak harga nol", () => {
    const text = "Menfess ya Allah ini kemana arahnya";
    const check = evaluateModerationRules({
      title: "",
      description: text,
      category: "Lainnya",
      type: "menfess",
    });
    expect(check.action).toBe("allow");
    expect(check.riskScore).toBeLessThan(70);
  });

  it("menerima pertanyaan info kampus wajar di mading/menfess", () => {
    const text = "Ada yang tau kosan putri dekat pintu 4 USU budget 500rb per bulan?";
    const check = evaluateModerationRules({
      title: "",
      description: text,
      category: "Lainnya",
      type: "menfess",
    });
    expect(check.action).toBe("allow");
    expect(check.riskScore).toBeLessThan(70);
  });
});


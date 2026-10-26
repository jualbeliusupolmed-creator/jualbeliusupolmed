import { describe, it, expect } from "vitest";
import { checkDeterministicModeration, moderateListing } from "../src/lib/moderationRules";

describe("moderationRules - Listing Moderation Engine", () => {
  it("rejects vape, pod, and liquid brands deterministically", () => {
    const res1 = checkDeterministicModeration({
      title: "OXVA Nexlim Mulus Lengkap",
      description: "Baru pake seminggu, batere awet",
      price: 250000,
      category: "Elektronik",
    });
    expect(res1.status).toBe("rejected");
    expect(res1.keyword).toBe("oxva");

    const res2 = checkDeterministicModeration({
      title: "Pod Voopoo Drag S second",
      description: "Kondisi 90%, bonus liquid saltnic",
      price: 300000,
      category: "Elektronik",
    });
    expect(res2.status).toBe("rejected");
  });

  it("catches leetspeak variations of prohibited keywords", () => {
    const res = checkDeterministicModeration({
      title: "Jual 0 x v 4 xlim go mulus",
      description: "Cod usu",
      price: 150000,
      category: "Elektronik",
    });
    expect(res.status).toBe("rejected");
  });

  it("rejects alcohol, illegal drugs, and thesis jockeying", () => {
    const resMiras = checkDeterministicModeration({
      title: "Anggur Merah Amer Orang Tua",
      price: 75000,
      category: "Makanan",
    });
    expect(resMiras.status).toBe("rejected");

    const resJoki = checkDeterministicModeration({
      title: "Jasa joki skripsi dan tugas akhir elektro",
      price: 500000,
      category: "Jasa",
    });
    expect(resJoki.status).toBe("rejected");

    const resGame = checkDeterministicModeration({
      title: "Jual Akun ML Mythic Glory Full Skin",
      price: 350000,
      category: "Elektronik",
    });
    expect(resGame.status).toBe("rejected");
  });

  it("flags listings with phone numbers in title or description to pending", () => {
    const res = checkDeterministicModeration({
      title: "Buku Kalkulus - Hubungi 081234567890",
      description: "Minat langsung wa aja ya kak",
      price: 65000,
      category: "Buku",
    });
    expect(res.status).toBe("pending");
    expect(res.moderation_reason).toContain("nomor telepon");
  });

  it("rejects price 0 or invalid price for paid items", () => {
    const resZero = checkDeterministicModeration({
      title: "Laptop ASUS Vivobook",
      description: "Nego sampai deal",
      price: 0,
      category: "Elektronik",
      type: "barang",
    });
    expect(resZero.status).toBe("rejected");
    expect(resZero.moderation_reason).toContain("Harga tidak valid");
  });

  it("allows price 0 only when type is gratis or category is Hibah", () => {
    const resGratis = checkDeterministicModeration({
      title: "Kardus bekas pindahan kos",
      description: "Ambil sendiri di depan gerbang 4",
      price: 0,
      category: "Lainnya",
      type: "gratis",
    });
    expect(resGratis.status).toBe("clean");
  });

  it("flags abnormally high prices to pending for admin verification", () => {
    const resHigh = checkDeterministicModeration({
      title: "Buku Novel Bekas",
      description: "Koleksi pribadi",
      price: 25000000, // Rp 25 juta untuk buku
      category: "Buku",
    });
    expect(resHigh.status).toBe("pending");
  });

  it("approves clean, legitimate student campus listings", async () => {
    const res = await moderateListing({
      title: "Buku Pengantar Akuntansi Edisi 4",
      description: "Buku bekas kuliah FEB, coretan pensil sedikit",
      price: 45000,
      category: "Buku Kuliah",
      type: "barang",
    });
    expect(res.status).toBe("approved");
    expect(res.risk_score).toBeLessThan(0.2);
  });
});

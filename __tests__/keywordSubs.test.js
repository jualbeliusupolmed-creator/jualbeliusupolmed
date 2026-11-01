import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addKeywordSubscription,
  removeKeywordSubscription,
  listKeywordSubscriptions,
  notifyKeywordSubscribers,
} from "@/lib/keywordSubs";

vi.mock("@/lib/fonnte", () => ({
  sendWa: vi.fn().mockResolvedValue({ ok: true }),
}));

import { sendWa } from "@/lib/fonnte";

describe("keywordSubs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak keyword yang terlalu pendek (< 2 karakter)", async () => {
    const supa = {};
    const res = await addKeywordSubscription(supa, "08123456789", "a");
    expect(res.ok).toBe(false);
    expect(res.message).toContain("minimal 2 karakter");
  });

  it("menyimpan keyword baru jika valid", async () => {
    const mockCount = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: 2 }),
    });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    const supa = {
      from: vi.fn((table) => {
        if (table === "keyword_subscriptions") {
          return {
            select: mockCount,
            upsert: mockUpsert,
          };
        }
        return {};
      }),
    };

    const res = await addKeywordSubscription(supa, "08123456789", "Buku Kalkulus");
    expect(res.ok).toBe(true);
    expect(res.keyword).toBe("buku kalkulus");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "buku kalkulus" }),
      expect.any(Object)
    );
  });

  it("mengirim notifikasi saat ada listing yang cocok dengan keyword", async () => {
    const mockSubs = [
      { id: "sub-1", buyer_wa: "081234567890", keyword: "kalkulus" },
      { id: "sub-2", buyer_wa: "089999999999", keyword: "sepeda" },
      { id: "sub-3", buyer_wa: "087777777777", keyword: "kalkulus purcell" },
    ];

    const supa = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockSubs, error: null }),
      }),
    };

    const listing = {
      id: "list-1",
      title: "Buku Kalkulus Edisi Purcell Mulus",
      description: "Dijual cepat karena sudah lulus matkul",
      price: 65000,
      seller_name: "Mahasiswa USU",
      seller_wa: "081111111111",
      campus: "USU",
      image_url: "https://example.com/buku.webp",
    };

    await notifyKeywordSubscribers(supa, listing);

    // sub-1 dan sub-3 harus dapat notif, sub-2 (sepeda) tidak
    expect(sendWa).toHaveBeenCalledTimes(2);
    expect(sendWa).toHaveBeenCalledWith(
      "081234567890",
      expect.stringContaining("kalkulus"),
      "https://example.com/buku.webp"
    );
    expect(sendWa).toHaveBeenCalledWith(
      "087777777777",
      expect.stringContaining("kalkulus purcell"),
      "https://example.com/buku.webp"
    );
  });
});

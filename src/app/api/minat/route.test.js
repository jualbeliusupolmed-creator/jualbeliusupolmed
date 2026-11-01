import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/fonnte", () => ({
  sendWa: vi.fn().mockResolvedValue({ ok: true }),
}));

import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa } from "@/lib/fonnte";

describe("POST /api/minat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak request tanpa listing_id", async () => {
    const req = new Request("http://localhost/api/minat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("listing_id wajib");
  });

  it("mengirimkan notifikasi WhatsApp saat ada tawaran harga", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
          error: null,
        }),
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "123",
            title: "Buku Kalkulus Purcel",
            listing_code: "BK01",
            seller_wa: "6281234567890",
            seller_name: "Budi",
            price: 75000,
          },
          error: null,
        }),
      }),
    });

    getAdminClient.mockReturnValue({
      from: vi.fn((table) => {
        if (table === "listings") return { select: mockSelect };
        if (table === "buyer_contacts") return { insert: mockInsert };
        return {};
      }),
    });

    const req = new Request("http://localhost/api/minat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id: "123",
        offer_price: 50000,
        notes: "Bisa nego tipis kak?",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.shortId).toBe("a1b2c3d4");

    expect(sendWa).toHaveBeenCalledWith(
      "6281234567890",
      expect.stringContaining("Ada Tawaran Harga Masuk!"),
      null,
      14400,
      expect.objectContaining({ jenis: "buyer_contact", listingId: "123" })
    );

    const callMessage = sendWa.mock.calls[0][1];
    expect(callMessage).toContain("Rp 50.000");
    expect(callMessage).toContain("DEAL%20a1b2c3d4");
    expect(callMessage).toContain("GAGAL%20a1b2c3d4");
  });
});

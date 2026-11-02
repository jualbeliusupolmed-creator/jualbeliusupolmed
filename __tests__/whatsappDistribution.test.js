import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/fonnte", () => ({
  daftarGrup: vi.fn(() => ["120363000000000000@g.us"]),
  sendWa: vi.fn(async () => ({ ok: true, status: "sent" })),
  sendChannelWa: vi.fn(async () => ({ ok: true, id: "msg_123" })),
}));

vi.mock("@/lib/admin-access", () => ({
  getAdminActor: vi.fn(),
  hasAdminPermission: vi.fn(() => true),
  getAdminCampusScope: vi.fn(async () => ["all"]),
}));

vi.mock("@/lib/botTokens", () => ({
  tokenBotUtama: vi.fn(() => "mock-bot-token"),
}));

import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa, sendChannelWa, daftarGrup } from "@/lib/fonnte";
import { resolveListingWhatsAppTargets, distributeListingToWhatsApp } from "@/lib/whatsappDistribution";
import { GET, POST } from "@/app/api/admin/whatsapp/channels/route";
import { getAdminActor } from "@/lib/admin-access";

describe("Phase 4: WhatsApp Multi-Channel Architecture & Dynamic Distribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveListingWhatsAppTargets", () => {
    it("resolves hierarchy (university + province) from organization_social_accounts", async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "universities") {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "univ-usu-uuid",
                  code: "USU",
                  province_id: "prov-sumut-uuid",
                },
              }),
            };
          }
          if (table === "organization_social_accounts") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({
                data: [
                  {
                    provider: "whatsapp_channel",
                    handle: "120363111111111111@newsletter",
                    external_account_id: "120363111111111111@newsletter",
                    scope_type: "university",
                    university_id: "univ-usu-uuid",
                    province_id: null,
                    status: "active",
                  },
                  {
                    provider: "whatsapp_channel",
                    handle: "120363222222222222@newsletter",
                    external_account_id: "120363222222222222@newsletter",
                    scope_type: "province",
                    university_id: null,
                    province_id: "prov-sumut-uuid",
                    status: "active",
                  },
                  {
                    provider: "whatsapp_group",
                    handle: "Komunitas Mahasiswa USU",
                    external_account_id: "120363333333333333@g.us",
                    scope_type: "university",
                    university_id: "univ-usu-uuid",
                    province_id: null,
                    status: "active",
                  },
                ],
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const listing = {
        id: "prod-1",
        title: "Buku Kalkulus Purcel",
        price: 75000,
        campus: "USU",
      };

      const res = await resolveListingWhatsAppTargets(listing, {});

      expect(res.universityId).toBe("univ-usu-uuid");
      expect(res.provinceId).toBe("prov-sumut-uuid");
      expect(res.channelJids).toContain("120363111111111111@newsletter");
      expect(res.channelJids).toContain("120363222222222222@newsletter");
      expect(res.groupJids).toContain("120363333333333333@g.us");
      expect(res.sources.length).toBe(3);
    });

    it("falls back to legacy adminSettings when no organization accounts found", async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "universities") {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          if (table === "organization_social_accounts") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({ data: [] }),
            };
          }
          return {};
        }),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const listing = {
        id: "prod-fallback",
        title: "Kipas Angin Kos",
        price: 50000,
        campus: "Semua",
      };

      const adminSettings = {
        channelJid: "120363999999999999@newsletter",
        idGrup: "120363000000000000@g.us",
      };

      const res = await resolveListingWhatsAppTargets(listing, adminSettings);

      expect(res.channelJids).toEqual(["120363999999999999@newsletter"]);
      expect(res.groupJids).toEqual(["120363000000000000@g.us"]);
      expect(res.sources).toEqual([
        { type: "channel", scope: "legacy_global", jid: "120363999999999999@newsletter" },
        { type: "group", scope: "legacy_global", jid: "120363000000000000@g.us" },
      ]);
    });
  });

  describe("distributeListingToWhatsApp", () => {
    it("broadcasts to isolated channels and groups", async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "universities") {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "u-1", code: "USU", province_id: "p-1" },
              }),
            };
          }
          if (table === "organization_social_accounts") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({
                data: [
                  {
                    provider: "whatsapp_channel",
                    handle: "usu_channel",
                    external_account_id: "120363111@newsletter",
                    scope_type: "university",
                  },
                  {
                    provider: "whatsapp_group",
                    handle: "Komunitas USU",
                    external_account_id: "120363222@g.us",
                    scope_type: "university",
                  },
                ],
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const listing = {
        id: "prod-broadcast-1",
        title: "Helm KYT Bagus",
        price: 150000,
        description: "Mulus jarang dipakai",
        campus: "USU",
      };

      const res = await distributeListingToWhatsApp(listing, {});

      expect(sendChannelWa).toHaveBeenCalledWith("120363111@newsletter", expect.stringContaining("Helm KYT Bagus"), {
        listingId: "prod-broadcast-1",
      });
      expect(sendWa).toHaveBeenCalledWith("120363222@g.us", expect.stringContaining("Helm KYT Bagus"), null, null, {
        jenis: "grup",
        listingId: "prod-broadcast-1",
      });
      expect(res.ok).toBe(true);
      expect(res.channels.length).toBe(1);
      expect(res.groups.length).toBe(1);
    });
  });

  describe("WhatsApp Channels API Route (/api/admin/whatsapp/channels)", () => {
    it("GET rejects unauthorized requests", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce(null);
      const res = await GET(new Request("http://localhost/api/admin/whatsapp/channels"));
      expect(res.status).toBe(401);
    });

    it("GET returns accounts filtered by admin actor", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce({
        id: "admin-1",
        role: "superadmin",
      });

      const mockAccounts = [
        {
          id: "acc-1",
          provider: "whatsapp_channel",
          handle: "Kanal Nasional",
          external_account_id: "1203631@newsletter",
          scope_type: "national",
          status: "active",
        },
      ];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockAccounts, error: null }),
        })),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const res = await GET(new Request("http://localhost/api/admin/whatsapp/channels"));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.accounts.length).toBe(1);
      expect(json.accounts[0].handle).toBe("Kanal Nasional");
    });

    it("POST handles upsert_channel successfully", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce({
        id: "admin-super",
        role: "superadmin",
      });

      const mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const payload = {
        action: "upsert_channel",
        provider: "whatsapp_channel",
        handle: "Channel USU Baru",
        externalAccountId: "120363999@newsletter",
        universityId: "univ-usu-uuid",
      };

      const res = await POST(
        new Request("http://localhost/api/admin/whatsapp/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.message).toContain("berhasil disimpan");
    });
  });
});

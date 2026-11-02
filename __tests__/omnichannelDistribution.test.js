import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/fonnte", () => ({
  sendWa: vi.fn(async () => ({ ok: true, status: "sent" })),
  sendChannelWa: vi.fn(async () => ({ ok: true, id: "chan_msg_123" })),
}));

vi.mock("@/lib/admin-access", () => ({
  getAdminActor: vi.fn(),
  hasAdminPermission: vi.fn(() => true),
  getAdminCampusScope: vi.fn(async () => ["all"]),
}));

vi.mock("@/lib/listingInstagram", () => ({
  queueListingInstagram: vi.fn(async () => ({ queued: true })),
}));

import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa, sendChannelWa } from "@/lib/fonnte";
import { getAdminActor } from "@/lib/admin-access";
import {
  buildOmnichannelCaption,
  resolveOmnichannelTargets,
  createOmnichannelDistributionPlans,
  executeOmnichannelPublish,
} from "@/lib/omnichannelDistribution";
import { GET, POST } from "@/app/api/admin/distribution/route";

describe("Phase 5: Central Distribution Manager (Omnichannel Product Publishing)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildOmnichannelCaption", () => {
    const listing = {
      id: "prod-omn-1",
      title: "MacBook Air M1 256GB",
      price: 9500000,
      campus: "USU",
      category: "Elektronik",
      condition: "preloved",
      description: "Baterai 90%, mulus lengkap dengan charger asli.",
    };

    it("generates Instagram caption with hashtags and price formatting", () => {
      const caption = buildOmnichannelCaption(listing, "instagram_university", {
        university: { code: "USU", name: "Universitas Sumatera Utara" },
        province: { name: "Sumatera Utara" },
      });

      expect(caption).toContain("MacBook Air M1 256GB");
      expect(caption).toContain("Universitas Sumatera Utara");
      expect(caption).toContain("#JualBeliDiKampus");
      expect(caption).toContain("#USU");
      expect(caption).toContain("#SumateraUtara");
    });

    it("generates WhatsApp Channel broadcast caption with clean links", () => {
      const caption = buildOmnichannelCaption(listing, "whatsapp_channel_university", {
        university: { code: "USU", name: "Universitas Sumatera Utara" },
      });

      expect(caption).toContain("*Katalog Baru USU*");
      expect(caption).toContain("*MacBook Air M1 256GB*");
      expect(caption).toContain("Lihat & Pesan:");
    });

    it("generates WhatsApp Community Group caption with safety reminder", () => {
      const caption = buildOmnichannelCaption(listing, "whatsapp_group_community", {
        university: { code: "USU", name: "Universitas Sumatera Utara" },
      });

      expect(caption).toContain("[BURSA KAMPUS]");
      expect(caption).toContain("Utamakan COD");
    });
  });

  describe("resolveOmnichannelTargets", () => {
    it("resolves available channels from organization accounts", async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "universities") {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "usu",
                  code: "USU",
                  name: "Universitas Sumatera Utara",
                  province_id: "sumatera-utara",
                  provinces: { id: "sumatera-utara", name: "Sumatera Utara" },
                },
              }),
            };
          }
          if (table === "organization_social_accounts") {
            return {
              select: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "acc-ig-usu",
                    provider: "instagram",
                    handle: "usu.menfes",
                    scope_type: "university",
                  },
                  {
                    id: "acc-wa-chan-usu",
                    provider: "whatsapp_channel",
                    handle: "Kanal USU",
                    external_account_id: "120363111@newsletter",
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
        id: "prod-2",
        title: "Buku Teks Kedokteran",
        price: 120000,
        campus: "USU",
      };

      const result = await resolveOmnichannelTargets(listing);

      expect(result.university.code).toBe("USU");
      expect(result.province.name).toBe("Sumatera Utara");
      const types = result.channels.map((c) => c.channelType);
      expect(types).toContain("website");
      expect(types).toContain("instagram_university");
      expect(types).toContain("whatsapp_channel_university");
    });
  });

  describe("executeOmnichannelPublish", () => {
    it("publishes to WhatsApp Channel successfully and updates status to published", async () => {
      const mockJob = {
        id: "job-1",
        channel_type: "whatsapp_channel_university",
        target_destination: "120363111@newsletter",
        caption_snapshot: "Test Caption",
        attempts: 0,
        max_attempts: 3,
        listings: {
          id: "listing-abc",
          title: "Sepeda Lipat",
          price: 1200000,
        },
      };

      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "omnichannel_distributions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
              update: vi.fn().mockReturnThis(),
            };
          }
          return {};
        }),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const res = await executeOmnichannelPublish("job-1");

      expect(sendChannelWa).toHaveBeenCalledWith("120363111@newsletter", "Test Caption", {
        listingId: "listing-abc",
      });
      expect(res.ok).toBe(true);
    });

    it("marks job as failed and increments attempts when sender throws error", async () => {
      const mockJob = {
        id: "job-fail-1",
        channel_type: "whatsapp_channel_university",
        target_destination: "120363111@newsletter",
        caption_snapshot: "Test Caption",
        attempts: 1,
        max_attempts: 3,
        listings: {
          id: "listing-abc",
          title: "Sepeda Lipat",
        },
      };

      vi.mocked(sendChannelWa).mockResolvedValueOnce({ ok: false, error: "Connection Timeout" });

      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "omnichannel_distributions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { ...mockJob, status: "failed", attempts: 2 }, error: null }),
              update: vi.fn().mockReturnThis(),
            };
          }
          return {};
        }),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const res = await executeOmnichannelPublish("job-fail-1");

      expect(res.ok).toBe(false);
      expect(res.error).toContain("Connection Timeout");
    });
  });

  describe("API Route /api/admin/distribution", () => {
    it("GET rejects unauthorized users", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce(null);
      const res = await GET(new Request("http://localhost/api/admin/distribution"));
      expect(res.status).toBe(401);
    });

    it("POST publish_channels handles batch omnichannel publishing", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce({
        id: "admin-123",
        role: "superadmin",
      });

      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "omnichannel_distributions") {
            return {
              upsert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "job-created-1", channel_type: "website" },
                error: null,
              }),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "job-created-1",
                  channel_type: "website",
                  listings: { id: "prod-1", title: "Kamera Sony" },
                },
                error: null,
              }),
              update: vi.fn().mockReturnThis(),
            };
          }
          if (table === "listings") {
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const payload = {
        action: "publish_channels",
        listingId: "prod-1",
        channels: [
          {
            channelType: "website",
            targetDestination: "https://www.kampuskita.my.id/produk/kamera-sony-prod-1",
          },
        ],
      };

      const res = await POST(
        new Request("http://localhost/api/admin/distribution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.jobs.length).toBe(1);
    });
  });
});


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

vi.mock("@/lib/instagramAccountCredentials", () => ({
  getInstagramAccountCredentials: vi.fn(async () => ({
    token: "test-meta-token",
    apiBase: "https://graph.facebook.com",
  })),
}));

vi.mock("@/lib/meta", () => ({
  postToInstagram: vi.fn(async () => ({ id: "meta-publication-1" })),
}));

import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa, sendChannelWa } from "@/lib/fonnte";
import { getAdminActor } from "@/lib/admin-access";
import { getInstagramAccountCredentials } from "@/lib/instagramAccountCredentials";
import { postToInstagram } from "@/lib/meta";
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
    function executeMock(job, { publishResult = { id: "published-job" } } = {}) {
      let writeCount = 0;
      return {
        from: vi.fn((table) => {
          if (table !== "omnichannel_distributions") return {};
          const query = {
            select: vi.fn(() => query),
            eq: vi.fn(() => query),
            in: vi.fn(() => query),
            update: vi.fn(() => { writeCount += 1; return query; }),
            maybeSingle: vi.fn(async () => ({ data: { id: job.id }, error: null })),
            single: vi.fn(async () => ({
              data: writeCount === 0 ? job : publishResult,
              error: null,
            })),
          };
          return query;
        }),
      };
    }

    it("publishes to WhatsApp Channel successfully and updates status to published", async () => {
      const mockJob = {
        id: "job-1",
        channel_type: "whatsapp_channel_university",
        target_destination: "120363111@newsletter",
        university_id: "usu",
        caption_snapshot: "Test Caption",
        attempts: 0,
        max_attempts: 3,
        organization_social_accounts: {
          id: "acc-wa-chan-usu",
          provider: "whatsapp_channel",
          status: "connected",
          scope_type: "university",
          scope_id: "usu",
          university_id: "usu",
          handle: "Kanal USU",
          external_account_id: "120363111@newsletter",
        },
        listings: {
          id: "listing-abc",
          title: "Sepeda Lipat",
          price: 1200000,
          status: "active",
        },
      };

      vi.mocked(getAdminClient).mockReturnValue(executeMock(mockJob));

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
        university_id: "usu",
        caption_snapshot: "Test Caption",
        attempts: 1,
        max_attempts: 3,
        organization_social_accounts: {
          id: "acc-wa-chan-usu",
          provider: "whatsapp_channel",
          status: "connected",
          scope_type: "university",
          scope_id: "usu",
          university_id: "usu",
          handle: "Kanal USU",
          external_account_id: "120363111@newsletter",
        },
        listings: {
          id: "listing-abc",
          title: "Sepeda Lipat",
          status: "active",
        },
      };

      vi.mocked(sendChannelWa).mockResolvedValueOnce({ ok: false, error: "Connection Timeout" });

      vi.mocked(getAdminClient).mockReturnValue(executeMock(mockJob, {
        publishResult: { ...mockJob, status: "failed", attempts: 2 },
      }));

      const res = await executeOmnichannelPublish("job-fail-1");

      expect(res.ok).toBe(false);
      expect(res.error).toContain("Connection Timeout");
    });

    it("does not publish a listing that became inactive after a job was queued", async () => {
      const mockJob = {
        id: "job-inactive",
        channel_type: "whatsapp_channel_university",
        target_destination: "120363111@newsletter",
        university_id: "usu",
        caption_snapshot: "Test Caption",
        attempts: 0,
        max_attempts: 3,
        organization_social_accounts: {
          id: "acc-wa-chan-usu",
          provider: "whatsapp_channel",
          status: "connected",
          scope_type: "university",
          scope_id: "usu",
          university_id: "usu",
          handle: "Kanal USU",
          external_account_id: "120363111@newsletter",
        },
        listings: {
          id: "listing-pending",
          title: "Barang menunggu moderasi",
          status: "pending",
        },
      };
      vi.mocked(getAdminClient).mockReturnValue(executeMock(mockJob, {
        publishResult: { ...mockJob, status: "failed", attempts: 1 },
      }));

      const result = await executeOmnichannelPublish("job-inactive");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Listing tidak lagi aktif");
      expect(sendChannelWa).not.toHaveBeenCalled();
    });

    it("publishes an Instagram job with that account's own token and Meta ID", async () => {
      const mockJob = {
        id: "job-ig-1",
        channel_type: "instagram_university",
        target_destination: "jualbelidikampus.usu",
        university_id: "usu",
        caption_snapshot: "Test listing caption",
        attempts: 0,
        max_attempts: 3,
        organization_social_accounts: {
          id: "acc-ig-usu",
          provider: "instagram",
          status: "connected",
          scope_type: "university",
          scope_id: "usu",
          university_id: "usu",
          handle: "jualbelidikampus.usu",
          external_account_id: "17841400000000001",
        },
        listings: { id: "listing-ig", title: "Buku kuliah", status: "active", image_url: "https://media.example.test/item.jpg" },
      };
      vi.mocked(getAdminClient).mockReturnValue(executeMock(mockJob, {
        publishResult: { id: "job-ig-1", status: "published" },
      }));

      const result = await executeOmnichannelPublish("job-ig-1");

      expect(getInstagramAccountCredentials).toHaveBeenCalledWith(expect.anything(), mockJob.organization_social_accounts);
      expect(postToInstagram).toHaveBeenCalledWith(
        "17841400000000001",
        "test-meta-token",
        expect.stringContaining("/api/listings/listing-ig/instagram-image"),
        "Test listing caption",
        { apiBase: "https://graph.facebook.com" },
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("API Route /api/admin/distribution", () => {
    it("GET rejects unauthorized users", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce(null);
      const res = await GET(new Request("http://localhost/api/admin/distribution"));
      expect(res.status).toBe(401);
    });

    it("refuses direct publishing when a listing has not passed moderation", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce({
        id: "admin-123",
        role: "superadmin",
      });
      const listingQuery = {
        select: vi.fn(() => listingQuery),
        eq: vi.fn(() => listingQuery),
        maybeSingle: vi.fn(async () => ({
          data: { id: "pending-listing", campus: "USU", status: "pending" },
          error: null,
        })),
      };
      const mockSupabase = { from: vi.fn(() => listingQuery) };
      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const res = await POST(new Request("http://localhost/api/admin/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish_channels",
          listingId: "pending-listing",
          channels: [{ channelType: "website" }],
        }),
      }));

      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({
        error: "Hanya iklan aktif yang dapat dipublikasikan atau dijadwalkan.",
      });
    });

    it("POST publish_channels handles batch omnichannel publishing", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce({
        id: "admin-123",
        role: "superadmin",
      });

      let distributionQueryNumber = 0;
      const listing = { id: "prod-1", title: "Kamera Sony", campus: "Semua", status: "active" };
      const createdJob = {
        id: "job-created-1",
        listing_id: "prod-1",
        channel_type: "website",
        target_destination: "https://www.kampuskita.my.id/produk/kamera-sony-prod-1",
        status: "approved",
        listings: listing,
      };
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "omnichannel_distributions") {
            const queryNumber = ++distributionQueryNumber;
            const query = {
              select: vi.fn(() => query),
              eq: vi.fn(() => query),
              is: vi.fn(() => query),
              in: vi.fn(() => query),
              insert: vi.fn(() => query),
              update: vi.fn(() => query),
              maybeSingle: vi.fn(async () => {
                if (queryNumber === 1) return { data: null, error: null };
                if (queryNumber === 2) return { data: createdJob, error: null };
                return { data: { id: "job-created-1" }, error: null };
              }),
              single: vi.fn(async () => ({
                data: queryNumber === 3 ? createdJob : { ...createdJob, status: "published" },
                error: null,
              })),
            };
            return query;
          }
          if (table === "listings") {
            const query = {
              select: vi.fn(() => query),
              update: vi.fn(() => query),
              eq: vi.fn(() => query),
              maybeSingle: vi.fn(async () => ({ data: listing, error: null })),
              then(resolve, reject) { return Promise.resolve({ data: null, error: null }).then(resolve, reject); },
            };
            return query;
          }
          if (table === "organization_social_accounts") {
            const query = {
              select: vi.fn(() => query),
              neq: vi.fn(() => query),
              then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
            };
            return query;
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
          headers: { "Content-Type": "application/json", origin: "https://www.kampuskita.my.id" },
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

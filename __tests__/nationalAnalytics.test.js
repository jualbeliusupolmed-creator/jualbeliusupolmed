import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
  getAdminActor: vi.fn(),
  hasAdminPermission: vi.fn(() => true),
  getAdminCampusScope: vi.fn(async () => ["all"]),
}));

import { getAdminClient } from "@/lib/supabaseAdmin";
import { getAdminActor } from "@/lib/admin-access";
import { getNationalAnalyticsData } from "@/lib/nationalAnalytics";
import { GET, POST } from "@/app/api/admin/analytics/national/route";

describe("Phase 6: National Analytics & Multi-Provincial Rollout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNationalAnalyticsData", () => {
    it("aggregates national metrics, regional breakdown, and omnichannel conversion correctly", async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "provinces") {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: "sumatera-utara", name: "Sumatera Utara", status: "active" },
                  { id: "dki-jakarta", name: "DKI Jakarta", status: "active" },
                ],
              }),
            };
          }
          if (table === "universities") {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: "usu", code: "USU", name: "Universitas Sumatera Utara", province_id: "sumatera-utara", status: "active" },
                  { id: "ui", code: "UI", name: "Universitas Indonesia", province_id: "dki-jakarta", status: "active" },
                ],
              }),
            };
          }
          if (table === "organization_social_accounts") {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "acc-ig-1",
                    provider: "instagram",
                    handle: "usu.menfes",
                    scope_type: "university",
                    status: "connected",
                    last_checked_at: new Date().toISOString(),
                    universities: { code: "USU", name: "Universitas Sumatera Utara" },
                  },
                ],
              }),
            };
          }
          if (table === "provincial_rollout_checklists") {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "stage-1",
                    province_id: "sumatera-utara",
                    stage_number: 1,
                    status: "fully_launched",
                    instagram_setup: true,
                    whatsapp_channel_setup: true,
                  },
                ],
              }),
            };
          }
          if (table === "listings") {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: "l-1", title: "Buku Kalkulus", price: 50000, status: "active", campus: "USU", category: "Buku" },
                  { id: "l-2", title: "Sepeda", price: 1000000, status: "sold", campus: "USU", category: "Kendaraan" },
                  { id: "l-3", title: "Laptop Asus", price: 4000000, status: "active", campus: "UI", category: "Elektronik" },
                ],
              }),
            };
          }
          if (table === "omnichannel_distributions") {
            return {
              select: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: "d-1", channel_type: "website", status: "published" },
                  { id: "d-2", channel_type: "whatsapp_channel_university", status: "published" },
                  { id: "d-3", channel_type: "instagram_university", status: "failed" },
                ],
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const actor = { role: "superadmin", id: "super-1" };
      const res = await getNationalAnalyticsData(actor);

      expect(res.isSuperadmin).toBe(true);
      expect(res.summary.totalProvinces).toBe(2);
      expect(res.summary.totalUniversities).toBe(2);
      expect(res.summary.totalListings).toBe(3);
      expect(res.summary.activeListings).toBe(2);
      expect(res.summary.soldListings).toBe(1);
      expect(res.summary.totalGmv).toBe(1000000);

      // Provinces breakdown check
      expect(res.provincesBreakdown.length).toBe(2);
      const sumut = res.provincesBreakdown.find((p) => p.id === "sumatera-utara");
      expect(sumut).toBeDefined();
      expect(sumut.totalListings).toBe(2);
      expect(sumut.gmv).toBe(1000000);

      // Channel performance
      const webChan = res.channelPerformance.find((c) => c.channelType === "website");
      expect(webChan.published).toBe(1);
      expect(webChan.successRate).toBe(100);

      const igChan = res.channelPerformance.find((c) => c.channelType === "instagram_university");
      expect(igChan.failed).toBe(1);
      expect(igChan.successRate).toBe(0);

      // Social health
      expect(res.socialHealth.length).toBe(1);
      expect(res.socialHealth[0].isHealthy).toBe(true);

      // Rollout roadmap
      expect(res.rolloutRoadmap.length).toBe(1);
      expect(res.rolloutRoadmap[0].stage_number).toBe(1);
    });
  });

  describe("API Route /api/admin/analytics/national", () => {
    it("GET returns 401 when unauthorized", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("GET returns 200 with national dataset for admin actor", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce({
        role: "superadmin",
        id: "admin-super",
      });

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.summary).toBeDefined();
    });

    it("POST updates checklist item successfully", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce({
        role: "superadmin",
        id: "admin-super",
      });

      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { province_id: "dki-jakarta", instagram_setup: true },
            error: null,
          }),
        })),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const payload = {
        action: "update_checklist",
        provinceId: "dki-jakarta",
        itemKey: "instagram_setup",
        value: true,
      };

      const res = await POST(
        new Request("http://localhost/api/admin/analytics/national", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.checklist.instagram_setup).toBe(true);
    });

    it("POST mark_all_sop rejects bulk completion to preserve verified rollout data", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce({
        role: "superadmin",
        id: "admin-super",
      });

      const mockSupabase = { from: vi.fn() };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const res = await POST(
        new Request("http://localhost/api/admin/analytics/national", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_all_sop",
            provinceId: "jawa-barat",
            value: true,
          }),
        })
      );

      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toBeDefined();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("POST update_notes updates notes on provincial rollout stage", async () => {
      vi.mocked(getAdminActor).mockResolvedValueOnce({
        role: "superadmin",
        id: "admin-super",
      });

      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { province_id: "dki-jakarta", notes: "Kolaborasi BEM UI dan Trisakti aktif" },
            error: null,
          }),
        })),
      };

      vi.mocked(getAdminClient).mockReturnValue(mockSupabase);

      const res = await POST(
        new Request("http://localhost/api/admin/analytics/national", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_notes",
            provinceId: "dki-jakarta",
            notes: "Kolaborasi BEM UI dan Trisakti aktif",
          }),
        })
      );

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.checklist.notes).toContain("BEM UI");
    });
  });
});


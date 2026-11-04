import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  getAdminCampusScope: vi.fn(),
  hasAdminPermission: vi.fn(),
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
  getAdminActor: mocks.getAdminActor,
  getAdminCampusScope: mocks.getAdminCampusScope,
  hasAdminPermission: mocks.hasAdminPermission,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("@/lib/settings", () => ({
  getSettings: vi.fn(),
}));

vi.mock("@/lib/omnichannelDistribution", () => ({
  resolveOmnichannelTargets: vi.fn(),
  createOmnichannelDistributionPlans: vi.fn(),
  executeOmnichannelPublish: vi.fn(),
}));

import { PATCH } from "@/app/api/admin/marketplace/route";

describe("PATCH /api/admin/marketplace scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminActor.mockResolvedValue({
      userId: "admin-1",
      role: "campus_admin",
    });
    mocks.getAdminCampusScope.mockResolvedValue(["USU"]);
    mocks.hasAdminPermission.mockReturnValue(true);
  });

  it("uses the same campus-or-university scope for lookup and update", async () => {
    const scopeFilters = [];
    const targetQuery = {
      select: vi.fn(() => targetQuery),
      eq: vi.fn(() => targetQuery),
      or: vi.fn((filter) => {
        scopeFilters.push(filter);
        return targetQuery;
      }),
      maybeSingle: vi.fn(async () => ({
        data: { id: "listing-1", campus: "USU", university_id: "usu", status: "pending" },
        error: null,
      })),
    };
    const updateQuery = {
      eq: vi.fn(() => updateQuery),
      or: vi.fn((filter) => {
        scopeFilters.push(filter);
        return updateQuery;
      }),
      select: vi.fn(() => updateQuery),
      maybeSingle: vi.fn(async () => ({
        data: { id: "listing-1", status: "rejected" },
        error: null,
      })),
    };
    const supa = {
      from: vi.fn((table) => {
        if (table === "listings") {
          return {
            select: vi.fn(() => targetQuery),
            update: vi.fn(() => updateQuery),
          };
        }
        if (table === "admin_audit_events") {
          return { insert: vi.fn(async () => ({ error: null })) };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    mocks.getAdminClient.mockReturnValue(supa);

    const response = await PATCH(new Request("http://localhost/api/admin/marketplace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "listing-1", action: "reject" }),
    }));

    expect(response.status).toBe(200);
    expect(scopeFilters).toEqual([
      "campus.in.(USU),university_id.in.(usu)",
      "campus.in.(USU),university_id.in.(usu)",
    ]);
  });
});

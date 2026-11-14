import { describe, expect, it, vi } from "vitest";
import {
  canManageFypProvince,
  findRecentSoldProvinceListings,
  matchesProvince,
  normalizeProvinceId,
  provinceScopesForActor,
} from "./fypCuration";

describe("province FYP curation permissions", () => {
  it("limits province admins to explicit assigned provinces", () => {
    const actor = {
      role: "province_admin",
      roles: [{ role_code: "province_admin" }],
      scopes: [
        { scope_type: "province", scope_id: "sumatera-utara" },
        { scope_type: "university", scope_id: "usu" },
      ],
    };
    expect(canManageFypProvince(actor, "sumatera-utara")).toBe(true);
    expect(canManageFypProvince(actor, "dki-jakarta")).toBe(false);
    expect(canManageFypProvince(actor, "../../settings")).toBe(false);
  });

  it("allows superadmins to manage any valid province and rejects anonymous actors", () => {
    expect(canManageFypProvince({ role: "superadmin" }, "bali")).toBe(true);
    expect(canManageFypProvince(null, "bali")).toBe(false);
    expect(provinceScopesForActor({ role: "university_admin", scopes: [{ scope_type: "university", scope_id: "usu" }] })).toEqual([]);
  });

  it("normalizes only safe province identifiers", () => {
    expect(normalizeProvinceId(" Sumatera-Utara ")).toBe("sumatera-utara");
    expect(normalizeProvinceId("sumatera_utara")).toBe("");
  });
});

describe("sold listing FYP scope", () => {
  it("returns sold listings by seller province even when legacy target metadata conflicts", async () => {
    const rows = [
      { id: "local", status: "sold", campus: "UI", university_id: "ui", seller_province_id: "sumatera-utara" },
      { id: "outside", status: "sold", campus: "USU", university_id: "usu", seller_province_id: "dki-jakarta" },
    ];
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      in: vi.fn(() => builder),
      then: (resolve) => resolve({ data: rows, error: null }),
    };
    const supa = { from: vi.fn(() => builder) };

    const result = await findRecentSoldProvinceListings(supa, {
      province: { id: "sumatera-utara" },
      sellerWas: [],
      universityIds: ["usu", "polmed"],
      campusCodes: ["USU", "POLMED"],
      universities: [
        { id: "usu", code: "USU", province_id: "sumatera-utara" },
        { id: "polmed", code: "POLMED", province_id: "sumatera-utara" },
        { id: "ugm", code: "UGM", province_id: "di-yogyakarta" },
      ],
      campuses: [],
    });

    expect(builder.eq).toHaveBeenCalledWith("status", "sold");
    expect(builder.eq).toHaveBeenCalledWith("seller_province_id", "sumatera-utara");
    expect(result.map((item) => item.id)).toEqual(["local"]);
  });

  it("never treats legacy listing target campus as seller origin", () => {
    const context = { province: { id: "dki-jakarta" } };
    expect(matchesProvince({ campus: "UI", university_id: "ui", seller_province_id: "sumatera-utara" }, context)).toBe(false);
    expect(matchesProvince({ campus: "USU", university_id: "usu", seller_province_id: "dki-jakarta" }, context)).toBe(true);
  });
});

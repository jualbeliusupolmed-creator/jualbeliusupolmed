import { describe, expect, it } from "vitest";
import { canManageFypProvince, normalizeProvinceId, provinceScopesForActor } from "./fypCuration";

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

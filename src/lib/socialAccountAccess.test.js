import { describe, expect, it } from "vitest";
import { canManageSocialAccount, canManageSocialScope } from "./socialAccountAccess";

describe("social account scope isolation", () => {
  const provinceA = { role: "province_admin", scopes: [{ scope_type: "province", scope_id: "sumatera-utara" }] };
  const campusAdmin = { role: "university_admin", scopes: [{ scope_type: "university", scope_id: "usu" }] };

  it("lets a province admin manage only accounts in that province", () => {
    expect(canManageSocialAccount(provinceA, {
      scope_type: "university",
      university_id: "usu",
      universities: { province_id: "sumatera-utara", code: "USU" },
    })).toBe(true);
    expect(canManageSocialAccount(provinceA, {
      scope_type: "province",
      province_id: "jawa-barat",
    })).toBe(false);
  });

  it("lets a campus admin manage its assigned university but not a neighboring campus", () => {
    expect(canManageSocialScope(campusAdmin, {
      scope_type: "university",
      university_id: "usu",
      university_province_id: "sumatera-utara",
      university_code: "USU",
    })).toBe(true);
    expect(canManageSocialScope(campusAdmin, {
      scope_type: "university",
      university_id: "polmed",
      university_province_id: "sumatera-utara",
      university_code: "POLMED",
    })).toBe(false);
    expect(canManageSocialScope(campusAdmin, {
      scope_type: "province",
      province_id: "sumatera-utara",
    })).toBe(false);
  });

  it("lets superadmin manage any explicit scope", () => {
    expect(canManageSocialAccount({ role: "superadmin" }, { scope_type: "province", province_id: "bali" })).toBe(true);
  });
});

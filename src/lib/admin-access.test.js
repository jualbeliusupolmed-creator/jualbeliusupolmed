import { describe, expect, it } from "vitest";
import { hasAdminPermission, resolveAdminCampusScope } from "./admin-access";

describe("otorisasi workspace owner", () => {
  it("membatasi setiap aksi sesuai izin yang diberikan", () => {
    const actor = { role: "owner", permissions: { marketplace: ["read", "review"], reports: { read: true } } };
    expect(hasAdminPermission(actor, "marketplace", "read")).toBe(true);
    expect(hasAdminPermission(actor, "marketplace", "review")).toBe(true);
    expect(hasAdminPermission(actor, "marketplace", "manage")).toBe(false);
    expect(hasAdminPermission(actor, "reports", "read")).toBe(true);
    expect(hasAdminPermission(actor, "reports", "manage")).toBe(false);
    expect(hasAdminPermission(null, "marketplace", "read")).toBe(false);
  });

  it("memberi scope superadmin penuh, sementara owner tetap sesuai grant", () => {
    const actor = { role: "superadmin", permissions: {} };
    expect(hasAdminPermission(actor, "reports", "manage")).toBe(true);
    expect(resolveAdminCampusScope([{ scope_type: "campus", scope_id: "usu" }], [
      { id: "usu", shortName: "USU", name: "Universitas Sumatera Utara" },
      { id: "polmed", shortName: "POLMED", name: "Politeknik Negeri Medan" },
    ])).toEqual(["USU"]);
  });

  it("mengizinkan modul tambahan hanya sesuai izin eksplisit owner", () => {
    const actor = { role: "owner", permissions: { users: ["read", "manage"], finance: ["read"], analytics: ["read"] } };
    expect(hasAdminPermission(actor, "users", "manage")).toBe(true);
    expect(hasAdminPermission(actor, "finance", "read")).toBe(true);
    expect(hasAdminPermission(actor, "finance", "manage")).toBe(false);
    expect(hasAdminPermission(actor, "content", "read")).toBe(false);
    expect(hasAdminPermission(actor, "settings", "read")).toBe(false);
  });

  it("memperluas scope provinsi ke kampus di provinsi itu dan menggabungkan grant", () => {
    const campuses = [
      { id: "usu", shortName: "USU", name: "Universitas Sumatera Utara" },
      { id: "polmed", shortName: "POLMED", name: "Politeknik Negeri Medan" },
      { id: "ugm", shortName: "UGM", name: "Universitas Gadjah Mada", provinceId: "di-yogyakarta" },
    ];
    expect(resolveAdminCampusScope([
      { scope_type: "province", scope_id: "sumatera-utara" },
      { scope_type: "campus", scope_id: "ugm" },
      { scope_type: "campus", scope_id: "unknown" },
    ], campuses)).toEqual(["USU", "POLMED", "UGM"]);
  });
});

import { describe, expect, it } from "vitest";
import { itemMatchesFypScope, sortFypItems } from "./fypScope";

const campuses = [
  { id: "usu-id", shortName: "USU", provinceId: "sumatera-utara" },
  { id: "polmed-id", shortName: "POLMED", provinceId: "sumatera-utara" },
  { id: "ugm-id", shortName: "UGM", provinceId: "di-yogyakarta" },
];

describe("FYP scope", () => {
  it("keeps province listings inside their mapped universities", () => {
    expect(itemMatchesFypScope({ seller_province_id: "sumatera-utara", campus: "UI" }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(true);
    expect(itemMatchesFypScope({ seller_province_id: "dki-jakarta", campus: "USU" }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(false);
    expect(itemMatchesFypScope({ campus: "USU", seller_profiles: { home_university_id: "usu-id" } }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(true);
    expect(itemMatchesFypScope({ campus: "UI", university_id: "ui-id", seller_profiles: { home_university_id: "usu-id" } }, { scope: "province", provinceId: "dki-jakarta", campuses: [{ id: "ui-id", shortName: "UI", provinceId: "dki-jakarta" }] })).toBe(false);
    expect(itemMatchesFypScope({ campus: "UI", university_id: "ui-id", seller_profiles: {
      home_university_id: "ui-id",
      verified_university_id: "usu-id",
      affiliation_status: "verified_student",
    } }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(true);
  });

  it("does not treat missing campus data as a national listing", () => {
    expect(itemMatchesFypScope({ title: "Tanpa wilayah" }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(false);
    expect(itemMatchesFypScope({ campus: "Semua" }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(false);
    expect(itemMatchesFypScope({ campus: "Semua", university_id: "usu-id", seller_profiles: { home_university_id: "usu-id" } }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(true);
  });

  it("supports campus and custom scopes while rejecting legacy nationwide scope", () => {
    expect(itemMatchesFypScope({ product: { campus: "POLMED", seller_profiles: { home_university_id: "polmed-id" } } }, { scope: "campus", campus: "POLMED", campuses })).toBe(true);
    expect(itemMatchesFypScope({ seller_university_id: "ugm-id" }, { scope: "custom", universities: ["ugm-id"] })).toBe(true);
    expect(itemMatchesFypScope({ seller_university_id: "ugm-id" }, { scope: "custom", universities: ["USU"] })).toBe(false);
    expect(itemMatchesFypScope({ campus: "USU" }, { scope: "all" })).toBe(false);
    expect(itemMatchesFypScope({ campus: "USU" }, { scope: "campus", campus: "Semua" })).toBe(false);
  });

  it("places curated entries first in the order chosen by the province", () => {
    expect(sortFypItems([{ id: "c" }, { id: "a" }, { id: "b" }], ["b", "c"]).map((item) => item.id)).toEqual(["b", "c", "a"]);
  });
});

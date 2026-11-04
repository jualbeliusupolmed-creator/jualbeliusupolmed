import { describe, expect, it } from "vitest";
import { itemMatchesFypScope, sortFypItems } from "./fypScope";

const campuses = [
  { id: "usu-id", shortName: "USU", provinceId: "sumatera-utara" },
  { id: "polmed-id", shortName: "POLMED", provinceId: "sumatera-utara" },
  { id: "ugm-id", shortName: "UGM", provinceId: "di-yogyakarta" },
];

describe("FYP scope", () => {
  it("keeps province listings inside their mapped universities", () => {
    expect(itemMatchesFypScope({ campus: "USU" }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(true);
    expect(itemMatchesFypScope({ university_id: "polmed-id" }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(true);
    expect(itemMatchesFypScope({ campus: "UGM" }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(false);
  });

  it("does not treat missing campus data as a national listing", () => {
    expect(itemMatchesFypScope({ title: "Tanpa wilayah" }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(false);
    expect(itemMatchesFypScope({ campus: "Semua" }, { scope: "province", provinceId: "sumatera-utara", campuses })).toBe(true);
  });

  it("supports campus, custom, and nationwide scopes", () => {
    expect(itemMatchesFypScope({ product: { campus: "POLMED" } }, { scope: "campus", campus: "POLMED" })).toBe(true);
    expect(itemMatchesFypScope({ university_id: "ugm-id" }, { scope: "custom", universities: ["ugm-id"] })).toBe(true);
    expect(itemMatchesFypScope({ campus: "UGM" }, { scope: "custom", universities: ["USU"] })).toBe(false);
    expect(itemMatchesFypScope({ title: "Apa saja" }, { scope: "all" })).toBe(true);
  });

  it("places curated entries first in the order chosen by the province", () => {
    expect(sortFypItems([{ id: "c" }, { id: "a" }, { id: "b" }], ["b", "c"]).map((item) => item.id)).toEqual(["b", "c", "a"]);
  });
});

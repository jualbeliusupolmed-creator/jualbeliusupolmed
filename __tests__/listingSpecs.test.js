import { describe, expect, it } from "vitest";
import {
  buildSpecFilterToken,
  buildListingDescriptionTemplate,
  formatListingSpecs,
  getListingSpecFilters,
  parseSpecFilterToken,
  sanitizeListingSpecs,
} from "../src/lib/listingSpecs";

describe("listingSpecs helpers", () => {
  it("hanya menyimpan field yang valid untuk kategori terkait", () => {
    expect(
      sanitizeListingSpecs("Kos", {
        facilities: "AC + WiFi",
        distance: "5 menit ke USU",
        random: "harus dibuang",
      })
    ).toEqual({
      facilities: "AC + WiFi",
      distance: "5 menit ke USU",
    });
  });

  it("mengembalikan daftar label-value yang siap ditampilkan", () => {
    expect(
      formatListingSpecs("Jasa", {
        service_type: "Desain poster",
        turnaround: "1 hari",
      })
    ).toEqual([
      { key: "service_type", label: "Jenis jasa", value: "Desain poster" },
      { key: "turnaround", label: "Estimasi selesai", value: "1 hari" },
    ]);
  });

  it("membuat template deskripsi per kategori", () => {
    const template = buildListingDescriptionTemplate("Elektronik");
    expect(template).toContain("Brand:");
    expect(template).toContain("Garansi:");
  });

  it("menyediakan chip filter dan token URL yang stabil", () => {
    expect(getListingSpecFilters("Kos").some((item) => item.label === "AC")).toBe(true);
    expect(buildSpecFilterToken("facilities", "AC")).toBe("facilities:AC");
    expect(parseSpecFilterToken("facilities:AC")).toEqual({ key: "facilities", value: "AC" });
  });
});

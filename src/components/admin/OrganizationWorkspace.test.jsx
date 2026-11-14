import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { previewNationalCatalogCsv } from "./OrganizationWorkspace";

describe("previewNationalCatalogCsv", () => {
  it("maps official campus rows into inactive records and adds missing province inactive", () => {
    const result = previewNationalCatalogCsv(
      "NPSN,Nama Perguruan Tinggi,Provinsi\n123456,Universitas Contoh,Jawa Barat",
      { provinces: [], universities: [] },
    );

    expect(result.additions).toMatchObject([{
      id: "pt-123456",
      code: "123456",
      name: "Universitas Contoh",
      provinceId: "jawa-barat",
      active: false,
    }]);
    expect(result.provinces).toMatchObject([{ id: "jawa-barat", active: false }]);
    expect(result.additions[0].accounts).toEqual({ instagram: "", whatsapp_channel: "" });
  });

  it("accepts semicolon exports, ignores duplicates, and keeps existing province ids", () => {
    const result = previewNationalCatalogCsv(
      "Kode PT;Nama PT;Provinsi\n123456;Universitas Ada;DKI Jakarta\n123456;Universitas Ada;DKI Jakarta",
      {
        provinces: [{ id: "dki-jakarta", name: "DKI Jakarta", active: true }],
        universities: [{ id: "existing", code: "LAMA", name: "Universitas Lama" }],
      },
    );

    expect(result.additions).toHaveLength(1);
    expect(result.additions[0].provinceId).toBe("dki-jakarta");
    expect(result.provinces).toEqual([]);
    expect(result.skipped).toHaveLength(1);
  });

  it("recognizes official Kemdiktisaintek headers and province prefixes", () => {
    const result = previewNationalCatalogCsv(
      "npsn,nama_pt,provinsi_pt\n001058,Universitas Teuku Umar,Prov. Aceh\n001059,Universitas Contoh Jakarta,Prov. D.K.I. Jakarta\n001060,Kampus Contoh Yogya,Prov. D.I. Yogyakarta",
      {
        provinces: [
          { id: "aceh", name: "ACEH", active: true },
          { id: "dki-jakarta", name: "DKI Jakarta", active: true },
          { id: "di-yogyakarta", name: "DI Yogyakarta", active: true },
        ],
        universities: [],
      },
    );

    expect(result.additions.map((item) => item.provinceId)).toEqual([
      "aceh",
      "dki-jakarta",
      "di-yogyakarta",
    ]);
    expect(result.provinces).toEqual([]);
    expect(result.additions.every((item) => item.active === false)).toBe(true);
  });

  it("can preview every row in the published 2025 national candidate file", () => {
    const csv = readFileSync("docs/data/katalog-pt-kandidat-2025.csv", "utf8");
    const result = previewNationalCatalogCsv(csv, { provinces: [], universities: [] });

    expect(result.additions).toHaveLength(3568);
    expect(new Set(result.additions.map((item) => item.code)).size).toBe(3568);
    expect(result.provinces).toHaveLength(34);
    expect(result.additions.every((item) => item.active === false)).toBe(true);
  });

  it("normalizes official Bangka Belitung naming for a new inactive province", () => {
    const result = previewNationalCatalogCsv(
      "npsn,nama_pt,provinsi_pt\n001061,Universitas Contoh Babel,Prov. Bangka Belitung",
      { provinces: [], universities: [] },
    );

    expect(result.provinces).toEqual([
      expect.objectContaining({ id: "kepulauan-bangka-belitung", name: "Kepulauan Bangka Belitung", active: false }),
    ]);
    expect(result.additions[0].provinceId).toBe("kepulauan-bangka-belitung");
  });

  it("keeps same-named institutions in different provinces when their source IDs differ", () => {
    const result = previewNationalCatalogCsv(
      "NPSN,Nama PT,Provinsi\n111111,Politeknik Contoh,Jawa Barat\n222222,Politeknik Contoh,Jawa Timur",
      { provinces: [], universities: [] },
    );

    expect(result.additions).toHaveLength(2);
    expect(new Set(result.additions.map((item) => item.id)).size).toBe(2);
    expect(result.provinces).toHaveLength(2);
  });

  it("rejects a source file without the required name and province columns", () => {
    expect(() => previewNationalCatalogCsv(
      "Nama,Wilayah\nUniversitas A,Barat",
      { provinces: [], universities: [] },
    )).toThrow("Kolom wajib belum ditemukan");
  });
});

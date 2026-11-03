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

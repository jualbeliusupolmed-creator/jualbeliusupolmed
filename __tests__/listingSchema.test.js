import { describe, it, expect } from "vitest";
import { normalizePriceInput, sanitizeListingTitle, listingInputSchema } from "../src/lib/listingSchema";

describe("listingSchema - Price & Field Validation", () => {
  it("normalizes clean numerical prices and formatted rupiah strings", () => {
    expect(normalizePriceInput(1300000)).toBe(1300000);
    expect(normalizePriceInput("1300000")).toBe(1300000);
    expect(normalizePriceInput("1.300.000")).toBe(1300000);
    expect(normalizePriceInput("Rp 1.300.000")).toBe(1300000);
  });

  it("rejects invalid abbreviations like '0m', '1,3jt', '50k', 'nego'", () => {
    expect(() => normalizePriceInput("0m")).toThrow(/singkatan/);
    expect(() => normalizePriceInput("1,3jt")).toThrow(/singkatan/);
    expect(() => normalizePriceInput("50k")).toThrow(/singkatan/);
    expect(() => normalizePriceInput("nego")).toThrow(/singkatan/);
  });

  it("rejects price 0 or negative for regular items", () => {
    expect(() => normalizePriceInput(0, "barang")).toThrow(/lebih dari Rp 0/);
    expect(() => normalizePriceInput("0", "barang")).toThrow(/lebih dari Rp 0/);
    expect(() => normalizePriceInput(-5000, "barang")).toThrow(/lebih dari Rp 0/);
  });

  it("allows price 0 when type is 'gratis' or category is 'Hibah'", () => {
    expect(normalizePriceInput(0, "gratis")).toBe(0);
    expect(normalizePriceInput("0", "barang", "Hibah")).toBe(0);
  });

  it("enforces maximum price limits per category", () => {
    expect(() => normalizePriceInput(10000000, "barang", "Makanan")).toThrow(/maksimal untuk kategori Makanan/);
  });

  it("sanitizes titles: collapses spaces and formats ALL CAPS neatly while preserving acronyms", () => {
    const raw = "  JUAL   LAPTOP   ASUS   ROG  RAM 16GB   SSD  ";
    const cleaned = sanitizeListingTitle(raw);
    expect(cleaned).toBe("Jual Laptop Asus ROG RAM 16GB SSD");
  });

  it("validates valid listing input with listingInputSchema", () => {
    const validData = {
      seller_name: "Rizky Pratama",
      seller_wa: "081234567890",
      title: "Buku Pengantar Akuntansi FEB USU",
      description: "Kondisi sangat mulus terawat.",
      price: "65.000",
      stock: 1,
      category: "Buku Kuliah",
      type: "barang",
    };

    const parsed = listingInputSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    expect(parsed.data.title).toBe("Buku Pengantar Akuntansi FEB USU");
  });
});

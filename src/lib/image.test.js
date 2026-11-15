import { describe, expect, it } from "vitest";
import { validateImageFile } from "./image";

describe("image compression and validation", () => {
  it("allows large images without file size rejection", () => {
    // 25 MB mock file
    const largeFile = {
      name: "foto-kamera-48mp.jpg",
      type: "image/jpeg",
      size: 25 * 1024 * 1024,
    };
    expect(validateImageFile(largeFile)).toBeNull();
  });

  it("allows 50 MB mock image", () => {
    const hugeFile = {
      name: "banner-raw.png",
      type: "image/png",
      size: 50 * 1024 * 1024,
    };
    expect(validateImageFile(hugeFile)).toBeNull();
  });

  it("rejects non-image formats", () => {
    const pdfFile = {
      name: "dokumen.pdf",
      type: "application/pdf",
      size: 1024 * 1024,
    };
    expect(validateImageFile(pdfFile)).toBe("Format harus JPG, PNG, atau WebP.");
  });

  it("handles empty file", () => {
    expect(validateImageFile(null)).toBe("File tidak ada.");
  });
});

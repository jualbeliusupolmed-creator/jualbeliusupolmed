import { PhotonImage } from "@cf-wasm/photon/node";
import { describe, expect, it } from "vitest";
import { convertImageToWebp, processImageWithWatermark } from "./waImageProcessing";

function createPng() {
  const width = 240;
  const height = 120;
  const pixels = new Uint8Array(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels.set([96, 128, 160, 255], offset);
  }

  const image = new PhotonImage(pixels, width, height);
  try {
    return image.get_bytes();
  } finally {
    image.free();
  }
}

function readWebp(bytes) {
  return PhotonImage.new_from_byteslice(bytes);
}

describe("WhatsApp image processing", () => {
  it("converts images to WebP without changing their dimensions", async () => {
    const webp = await convertImageToWebp(createPng());
    const image = readWebp(webp);

    try {
      expect(Array.from(webp.slice(0, 4))).toEqual([82, 73, 70, 70]);
      expect(image.get_width()).toBe(240);
      expect(image.get_height()).toBe(120);
    } finally {
      image.free();
    }
  });

  it("adds a visible watermark before encoding to WebP", async () => {
    const source = createPng();
    const plain = await convertImageToWebp(source);
    const watermarked = await processImageWithWatermark(source);

    expect(watermarked).not.toEqual(plain);

    const image = readWebp(watermarked);
    try {
      expect(image.get_width()).toBe(240);
      expect(image.get_height()).toBe(120);
    } finally {
      image.free();
    }
  });

  it("rejects invalid image bytes instead of returning a success-shaped fallback", async () => {
    await expect(convertImageToWebp(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });
});

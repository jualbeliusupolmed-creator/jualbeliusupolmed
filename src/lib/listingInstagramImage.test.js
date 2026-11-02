import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  createListingInstagramBaseSvg,
  createListingInstagramOverlaySvg,
  createListingInstagramTextLayers,
  formatInstagramPrice,
  layoutListingInstagram,
} from "./listingInstagramImage";

describe("listing Instagram image", () => {
  const fontDirectory = path.join(
    process.cwd(),
    "src",
    "assets",
    "fonts",
    "plus-jakarta-sans",
  );
  const fonts = {
    regularFontPath: path.join(fontDirectory, "PlusJakartaSans-Regular.ttf"),
    semiboldFontPath: path.join(fontDirectory, "PlusJakartaSans-SemiBold.ttf"),
  };

  it("lays out a minimal 4:5 catalog card", () => {
    const listing = {
      title: "Laptop mahasiswa ringan untuk kuliah",
      price: 4500000,
      category: "Elektronik",
      campus: "USU",
      area: "Padang Bulan",
    };
    const layout = layoutListingInstagram(listing);
    const layerText = createListingInstagramTextLayers(listing, fonts)
      .map((layer) => layer.input.text.text)
      .join(" ");

    expect(createListingInstagramBaseSvg()).toContain('width="1080" height="1350"');
    expect(layout.titleLines.length).toBeLessThanOrEqual(2);
    expect(layout.price).toBe("Rp 4.500.000");
    expect(layerText).toContain("@usupolmedkatalog");
    expect(layerText).not.toContain("seller_wa");
  });

  it("formats free listings clearly", () => {
    expect(formatInstagramPrice(0)).toBe("Gratis");
  });

  it("renders to a JPEG-compatible 1080x1350 canvas", async () => {
    const listing = {
      title: "Jasa desain poster kampus",
      price: 50000,
      category: "Jasa",
      campus: "POLMED",
    };
    const rendered = await sharp(Buffer.from(createListingInstagramBaseSvg()))
      .composite([
        { input: Buffer.from(createListingInstagramOverlaySvg(false)), left: 0, top: 0 },
        ...createListingInstagramTextLayers(listing, fonts),
      ])
      .jpeg()
      .toBuffer();
    const metadata = await sharp(rendered).metadata();

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1350);
    expect(metadata.format).toBe("jpeg");
    expect(rendered.length).toBeGreaterThan(10_000);
  });

  it("lays out and renders a 9:16 story card (1080x1920) with dynamic campus branding", async () => {
    const listing = {
      title: "iPad Air 5 M1 64GB Space Grey Like New",
      price: 7800000,
      category: "Elektronik",
      campus: "UI",
      area: "Kukusan",
    };
    const layout = layoutListingInstagram(listing, "story");
    expect(layout.campusTag).toBe("UI");
    expect(layout.handle).toBe("@ui.menfes");
    expect(createListingInstagramBaseSvg("story")).toContain('width="1080" height="1920"');

    const rendered = await sharp(Buffer.from(createListingInstagramBaseSvg("story")))
      .composite([
        { input: Buffer.from(createListingInstagramOverlaySvg(false, "story")), left: 0, top: 0 },
        ...createListingInstagramTextLayers(listing, fonts, "story"),
      ])
      .jpeg()
      .toBuffer();
    const metadata = await sharp(rendered).metadata();

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1920);
    expect(metadata.format).toBe("jpeg");
    expect(rendered.length).toBeGreaterThan(10_000);
  });
});

import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  createMadingInstagramSvg,
  createMadingInstagramTextLayers,
  layoutMadingInstagramPost,
  wrapInstagramText,
} from "./madingInstagramImage";

describe("mading Instagram image", () => {
  it("creates the minimal 4:5 USU-POLMED layout", () => {
    const post = {
      content: "Semangat kuliah dan OJT. Tetap kompak untuk satu angkatan.",
    };
    const svg = createMadingInstagramSvg();
    const layers = createMadingInstagramTextLayers(post, {
      regularFontPath: "/fonts/regular.ttf",
      semiboldFontPath: "/fonts/semibold.ttf",
    });

    expect(svg).toContain('width="1080" height="1350"');
    expect(svg).toContain('fill="#F8F7F3"');
    expect(svg).not.toContain("<text");
    expect(layers.map((layer) => layer.input.text.text).join(" ")).toContain(
      "@usupolmedmenfess",
    );
    expect(layers.map((layer) => layer.input.text.text).join(" ")).toContain(
      "dikirim lewat jualbeliusupolmed.web.id",
    );
    expect(layers.map((layer) => layer.input.text.text).join(" ")).toContain(
      "USU · POLMED",
    );
    expect(
      layers.every((layer) => layer.input.text.fontfile.endsWith(".ttf")),
    ).toBe(true);
    expect(svg).not.toContain("MENFESS USU · POLMED");
  });

  it("uses smaller typography as the message grows", () => {
    const shortPost = layoutMadingInstagramPost({ content: "Halo kampus!" });
    const longPost = layoutMadingInstagramPost({ content: "pesan ".repeat(300) });

    expect(shortPost.fontSize).toBe(40);
    expect(longPost.fontSize).toBe(27);
    expect(longPost.lines.length).toBeLessThanOrEqual(17);
    expect(longPost.lines.at(-1)).toMatch(/…$/);
  });

  it("escapes user content and breaks oversized words safely", () => {
    const lines = wrapInstagramText("<rahasia> " + "a".repeat(70), 20, 5);
    const layers = createMadingInstagramTextLayers(
      { content: "A & B <aman>" },
      {
        regularFontPath: "/fonts/regular.ttf",
        semiboldFontPath: "/fonts/semibold.ttf",
      },
    );
    const layerText = layers.map((layer) => layer.input.text.text).join(" ");

    expect(lines.every((line) => Array.from(line).length <= 20)).toBe(true);
    expect(layerText).toContain("A &amp; B &lt;aman&gt;");
    expect(layerText).not.toContain("A & B <aman>");
  });

  it("removes unsupported emoji from the rendered image", () => {
    const layout = layoutMadingInstagramPost({
      content: "Semangat  untuk kampus ‍‍‍ ",
    });

    expect(layout.lines.join(" ")).toBe("Semangat untuk kampus");
  });

  it("reserves a compact photo area for Menfess with an attachment", () => {
    const post = {
      image_url: "https://example.test/photo.jpg",
      content: "Foto kegiatan kampus hari ini.",
    };
    const layout = layoutMadingInstagramPost(post);
    const svg = createMadingInstagramSvg({ hasPhoto: true });

    expect(layout.maxLines).toBe(6);
    expect(layout.firstLineY).toBeGreaterThan(700);
    expect(svg).toContain('x="122" y="237" width="836" height="476"');
  });

  it("renders with the bundled font files", async () => {
    const fontDirectory = path.join(
      process.cwd(),
      "src",
      "assets",
      "fonts",
      "plus-jakarta-sans",
    );
    const layers = createMadingInstagramTextLayers(
      { content: "Halo mahasiswa USU dan POLMED" },
      {
        regularFontPath: path.join(
          fontDirectory,
          "PlusJakartaSans-Regular.ttf",
        ),
        semiboldFontPath: path.join(
          fontDirectory,
          "PlusJakartaSans-SemiBold.ttf",
        ),
      },
    );
    const rendered = await sharp(Buffer.from(createMadingInstagramSvg()))
      .composite(layers)
      .png()
      .toBuffer();
    const metadata = await sharp(rendered).metadata();

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1350);
    expect(rendered.length).toBeGreaterThan(10_000);
  });

  it("creates and renders the 9:16 Story portrait format (1080 x 1920)", async () => {
    const fontDirectory = path.join(
      process.cwd(),
      "src",
      "assets",
      "fonts",
      "plus-jakarta-sans",
    );
    const post = {
      content: "Menfess untuk Story Instagram dan Status WhatsApp 9:16",
    };
    const svg = createMadingInstagramSvg({ ratio: "story" });
    const layers = createMadingInstagramTextLayers(post, {
      regularFontPath: path.join(fontDirectory, "PlusJakartaSans-Regular.ttf"),
      semiboldFontPath: path.join(fontDirectory, "PlusJakartaSans-SemiBold.ttf"),
    }, "story");

    expect(svg).toContain('width="1080" height="1920"');
    const rendered = await sharp(Buffer.from(svg))
      .composite(layers)
      .png()
      .toBuffer();
    const metadata = await sharp(rendered).metadata();

    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1920);
    expect(rendered.length).toBeGreaterThan(10_000);
  });
});

import { describe, expect, it } from "vitest";
import {
  createMadingInstagramSvg,
  layoutMadingInstagramPost,
  wrapInstagramText,
} from "./madingInstagramImage";

describe("mading Instagram image", () => {
  it("creates the minimal 4:5 USU-POLMED layout", () => {
    const svg = createMadingInstagramSvg({
      content: "Semangat kuliah dan OJT. Tetap kompak untuk satu angkatan.",
    });

    expect(svg).toContain('width="1080" height="1350"');
    expect(svg).toContain("@usupolmedmenfess");
    expect(svg).toContain("dikirim lewat jualbeliusupolmed.web.id");
    expect(svg).toContain("USU · POLMED");
    expect(svg).toContain('fill="#F8F7F3"');
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
    const svg = createMadingInstagramSvg({ content: "A & B <aman>" });

    expect(lines.every((line) => Array.from(line).length <= 20)).toBe(true);
    expect(svg).toContain("A &amp; B &lt;aman&gt;");
    expect(svg).not.toContain("A & B <aman>");
  });

  it("removes unsupported skin-tone modifiers from the rendered image", () => {
    const layout = layoutMadingInstagramPost({ content: "Semangat 🤌🏻" });

    expect(layout.lines.join(" ")).toBe("Semangat 🤌");
  });
});

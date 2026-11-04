import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderMetaHtml } from "../scripts/sync-meta-docs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Meta documentation HTML generation", () => {
  it("keeps the checked-in HTML exactly synchronized with the Markdown source", async () => {
    const markdown = await readFile(path.join(root, "docs/meta.md"), "utf8");
    const html = await readFile(path.join(root, "docs/meta.html"), "utf8");

    expect(await renderMetaHtml(markdown)).toBe(html);
  });

  it("escapes raw HTML from the Markdown source", async () => {
    const html = await renderMetaHtml("# Meta\n\n<script>alert(1)</script>\n");

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("removes unsafe link protocols from rendered Markdown", async () => {
    const html = await renderMetaHtml("# Meta\n\n[unsafe](javascript:alert(1))\n");

    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("unsafe");
  });

  it("generates table of contents links for source headings", async () => {
    const html = await renderMetaHtml("# Meta\n\n## Ringkasan kesiapan\n\nText.\n");

    expect(html).toContain('<a href="#ringkasan-kesiapan">Ringkasan kesiapan</a>');
    expect(html).toContain('<h2 id="ringkasan-kesiapan">Ringkasan kesiapan</h2>');
  });
});

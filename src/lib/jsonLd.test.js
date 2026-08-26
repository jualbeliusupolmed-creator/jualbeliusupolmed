import { describe, expect, it } from "vitest";
import { skripJsonLd } from "./jsonLd";

/*
 * Perbedaan antara aman dan tidak di sini cuma satu garis miring:
 * `.replace(/</g, "\\u003c")` menuliskan enam karakter, sedangkan
 * `.replace(/</g, "\u003c")` sudah berupa karakter "<" itu sendiri — jadi ia
 * mengganti "<" dengan "<". Tiga halaman produksi memakai bentuk yang kedua,
 * salah satunya (/jasa) menaruh judul iklan buatan penjual ke dalam JSON-LD.
 * Tes ini ada supaya bentuk yang kedua tidak bisa kembali tanpa ketahuan.
 */

describe("skripJsonLd", () => {
  it("memutus tag penutup </script> dari judul buatan pengguna", () => {
    const hasil = skripJsonLd({ name: "iPhone \u003c/script\u003escript\u003ealert(1)\u003c/script\u003e" });
    expect(hasil).not.toContain("</script>");
    expect(hasil).toContain("\\u003c/script");
  });

  it("tetap JSON yang sah dan isinya utuh setelah diurai balik", () => {
    const data = { name: "Kursi \u003cb\u003emurah\u003c/b\u003e", harga: 50000 };
    expect(JSON.parse(skripJsonLd(data))).toEqual(data);
  });

  it("ikut menutup U+2028/U+2029 yang memutus baris di JavaScript", () => {
    const hasil = skripJsonLd({ bio: "baris satu\u2028baris dua" });
    expect(hasil).not.toContain(" ");
    expect(hasil).toContain("\\u2028");
  });
});

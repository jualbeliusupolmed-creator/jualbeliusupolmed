import { describe, expect, it } from "vitest";
import { peranProfil, saringIsian, normalisasiIsian, bentukProfil, bersihkanGambar } from "./profil";
import { formatWa, adalahIdSintetis } from "./constants";

/*
 * Aturan profil satu pintu dikunci di sini karena ia sekarang dipakai DUA rute
 * (/api/profil dan /api/toko). Yang diuji bukan sekadar "fungsinya jalan",
 * melainkan tiga hal yang pernah benar-benar salah di produksi — masing-masing
 * gagal diam-diam sampai diperiksa langsung ke basis data.
 */

describe("peranProfil — lapisan, bukan pilihan tunggal", () => {
  it("tidak menganggap semua orang punya toko gara-gara store_status", () => {
    // `store_status` punya nilai bawaan 'draf' di basis data, jadi ia terisi
    // untuk SETIAP baris. Versi pertama fungsi ini memakainya sebagai penanda
    // toko, dan hasilnya 173 dari 173 profil produksi dianggap punya toko.
    expect(peranProfil({ wa: "0812", store_status: "draf" }).toko).toBe(false);
    expect(peranProfil({ wa: "0812", slug: "warung-a" }).toko).toBe(true);
    expect(peranProfil({ wa: "0812", store_name: "Warung A" }).toko).toBe(true);
  });

  it("membiarkan peran menumpuk", () => {
    const p = peranProfil({ wa: "0812", account_type: "ukm", slug: "bem-usu" });
    expect(p.organisasi).toBe(true);
    expect(p.toko).toBe(true);
    expect(p.dasar).toBe(true);
  });

  it("mengenali akun tanpa nomor dari kedua awalan sintetis", () => {
    expect(peranProfil({ wa: "email_ridho_4321" }).tanpaNomor).toBe(true);
    expect(peranProfil({ wa: "google_ridho_l2k9" }).tanpaNomor).toBe(true);
    expect(peranProfil({ wa: "081234567890" }).tanpaNomor).toBe(false);
  });
});

describe("saringIsian — batas peran ditegakkan server, bukan formulir", () => {
  const jahat = {
    name: "Budi",
    store_name: "Toko Selundupan",
    ukm_name: "BEM Palsu",
    ukm_verified: true,
    subscription_tier: "pro",
    free_bumps: 999,
    wa: "628999",
  };

  it("warga biasa tidak bisa menulis field toko maupun organisasi", () => {
    expect(Object.keys(saringIsian(jahat, peranProfil({ wa: "0812" })))).toEqual(["name"]);
  });

  it("pemilik toko dapat field toko, tetap tanpa field organisasi", () => {
    const k = Object.keys(saringIsian(jahat, peranProfil({ wa: "0812", slug: "a" })));
    expect(k).toContain("store_name");
    expect(k).not.toContain("ukm_name");
  });

  it("organisasi TIDAK PERNAH bisa menyalakan centangnya sendiri", () => {
    // Lubang yang sama pernah ada di /api/organisasi/daftar lewat kode undangan
    // yang bisa ditembus string empat huruf. Centang resmi hanya boleh datang
    // dari kode undangan yang benar atau dari admin — tidak pernah dari
    // formulir pemiliknya.
    const k = Object.keys(saringIsian(jahat, peranProfil({ wa: "0812", account_type: "ukm" })));
    expect(k).toContain("ukm_name");
    expect(k).not.toContain("ukm_verified");
  });

  it("tidak pernah meloloskan kunci utama atau kolom penagihan", () => {
    for (const peran of [{ wa: "0812" }, { wa: "0812", slug: "a" }, { wa: "0812", account_type: "ukm" }]) {
      const k = Object.keys(saringIsian(jahat, peranProfil(peran)));
      expect(k).not.toContain("wa");
      expect(k).not.toContain("subscription_tier");
      expect(k).not.toContain("free_bumps");
    }
  });
});

describe("normalisasiIsian — satu aturan untuk /api/profil dan /api/toko", () => {
  it("memangkas dan menyeragamkan Instagram apa pun bentuk masukannya", () => {
    expect(normalisasiIsian({ store_instagram: "@warungku" }).store_instagram).toBe("warungku");
    expect(normalisasiIsian({ store_instagram: "https://instagram.com/warungku" }).store_instagram).toBe("warungku");
  });

  it("membuang tautan peta yang bukan Google Maps", () => {
    expect(normalisasiIsian({ store_gmaps: "https://situs-lain.com/x" }).store_gmaps).toBeNull();
  });

  it("menyensor teks yang dibaca orang lain", () => {
    const hasil = normalisasiIsian({ name: "anjing kampus" });
    expect(hasil.name).not.toBe("anjing kampus");
  });

  it("store_open selalu boolean, tidak pernah string", () => {
    expect(normalisasiIsian({ store_open: false }).store_open).toBe(false);
    expect(normalisasiIsian({ store_open: undefined }).store_open).toBeUndefined();
  });
});

describe("bentukProfil — nomor yang tidak bisa dihubungi tidak disodorkan", () => {
  it("mengosongkan nomor untuk akun sintetis", () => {
    expect(bentukProfil({ wa: "google_ridho_l2k9" }, null).nomor).toBe("");
    expect(bentukProfil({ wa: "081234567890" }, null).nomor).toBe("081234567890");
  });
});

describe("formatWa — pengenal sintetis tidak boleh menjelma jadi nomor asli", () => {
  it("menolak pengenal yang digitnya kebetulan membentuk nomor sah", () => {
    // Ini bukan kasus karangan: menyaring non-digit lebih dulu membuat
    // `email_0812345_1234` menjadi "08123451234" — panjangnya pas, awalannya
    // 08, dan itu nomor MILIK ORANG LAIN yang tidak pernah mendaftar apa pun.
    expect(formatWa("email_0812345_1234")).toBe("");
    expect(formatWa("email_081234567_9012")).toBe("");
    expect(formatWa("google_0812345678_ab12x")).toBe("");
  });

  it("tetap menerima nomor sungguhan dalam bentuk apa pun", () => {
    expect(formatWa("081234567890")).toBe("081234567890");
    expect(formatWa("6281234567890")).toBe("081234567890");
    expect(formatWa("+62 812-3456-7890")).toBe("081234567890");
  });

  it("mengenali pengenal sintetis lewat sifatnya, bukan daftar awalan", () => {
    // Aturan berbasis daftar awalan ketinggalan satu langkah setiap kali
    // seseorang menambah jenis pendaftaran baru — `google_` lolos begitu saja
    // dari tambalan yang hanya memeriksa `email_`.
    expect(adalahIdSintetis("cara_daftar_baru_123")).toBe(true);
    expect(adalahIdSintetis("081234567890")).toBe(false);
  });
});

describe("bersihkanGambar — logo, sampul, dan foto profil hanya dari penyimpanan kita", () => {
  it("menolak gambar dari host lain", () => {
    // Halaman toko dibangun untuk disebar ke banyak orang. URL gambar bebas di
    // sana berarti pelacak yang dimuat ulang setiap kali seseorang membukanya.
    expect(bersihkanGambar("https://pelacak.example/x.png")).toBeNull();
    expect(bersihkanGambar("http://cdn.supabase.co/x.png")).toBeNull(); // bukan https
    expect(bersihkanGambar("bukan-url")).toBeNull();
  });

  it("menerima gambar dari penyimpanan sendiri", () => {
    expect(bersihkanGambar("https://cdn.supabase.co/storage/x.png"))
      .toBe("https://cdn.supabase.co/storage/x.png");
  });

  it("ikut menjaga avatar_url, bukan cuma logo & sampul", () => {
    // Sebelum disatukan, penjaga ini hanya ada di /api/toko dan hanya untuk dua
    // kolom itu; foto profil yang tampil di kartu iklan tidak dijaga siapa pun.
    const hasil = normalisasiIsian({
      avatar_url: "https://pelacak.example/a.png",
      logo_url: "https://pelacak.example/b.png",
      banner_url: "https://pelacak.example/c.png",
    });
    expect(hasil.avatar_url).toBeNull();
    expect(hasil.logo_url).toBeNull();
    expect(hasil.banner_url).toBeNull();
  });
});

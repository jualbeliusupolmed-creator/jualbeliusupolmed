import { DEFAULT_SETTINGS } from "@/lib/settings";

/*
 * Data karangan untuk /admin-demo.
 *
 * ATURAN PALING PENTING DI BERKAS INI: tidak boleh ada satu pun nilai yang
 * berasal dari database sungguhan. Halaman yang memakainya terbuka untuk umum,
 * dan panel admin memang tempat nomor telepon, isi tawar-menawar, dan riwayat
 * pembayaran orang berkumpul. Panel demo yang menampilkan data asli bukan demo,
 * itu kebocoran dengan tampilan bagus.
 *
 * Karena itu semua nomor di sini memakai awalan 0800-0000-xxx yang tidak
 * dipakai operator mana pun di Indonesia — kalau ada yang tidak sengaja
 * menghubunginya, tidak ada orang di ujung sana.
 *
 * Bentuknya wajib sama persis dengan yang dikembalikan getAdminStats(), karena
 * komponen panelnya memang komponen yang sama. Menambah kolom di sana berarti
 * menambahnya di sini juga — kalau tidak, demo-nya berubah jadi panel yang
 * setengah kosong dan orang mengira memang begitu bentuknya.
 */

const HARI = 86_400_000;
const lalu = (hari) => new Date(Date.now() - hari * HARI).toISOString();
const nanti = (hari) => new Date(Date.now() + hari * HARI).toISOString();
const wa = (n) => `0800000${String(n).padStart(4, "0")}`;

const PENJUAL = [
  { n: 1, nama: "Aisyah Nabila", kampus: "USU" },
  { n: 2, nama: "Bagas Pratama", kampus: "Polmed" },
  { n: 3, nama: "Citra Ramadhani", kampus: "USU" },
  { n: 4, nama: "Dimas Kurniawan", kampus: "Polmed" },
  { n: 5, nama: "Elsa Wijaya", kampus: "USU" },
  { n: 6, nama: "Fajar Nugroho", kampus: "USU" },
  { n: 7, nama: "Gita Lestari", kampus: "Polmed" },
  { n: 8, nama: "Hendra Saputra", kampus: "USU" },
];

const KATEGORI = [
  { id: "k1", name: "Elektronik", slug: "elektronik", icon: "💻", sort_order: 1 },
  { id: "k2", name: "Buku & Alat Kuliah", slug: "buku", icon: "📚", sort_order: 2 },
  { id: "k3", name: "Kos & Sewa", slug: "kos", icon: "🏠", sort_order: 3 },
  { id: "k4", name: "Fashion", slug: "fashion", icon: "👕", sort_order: 4 },
  { id: "k5", name: "Kendaraan", slug: "kendaraan", icon: "🛵", sort_order: 5 },
  { id: "k6", name: "Jasa", slug: "jasa", icon: "🛠️", sort_order: 6 },
  { id: "k7", name: "Perabot", slug: "perabot", icon: "🪑", sort_order: 7 },
  { id: "k8", name: "Lain-lain", slug: "lain", icon: "📦", sort_order: 8 },
];

const BARANG = [
  ["Laptop Asus VivoBook 14 Ryzen 5", 4_250_000, "Elektronik", "jual", "active", 312],
  ["Buku Kalkulus Purcell Edisi 9", 85_000, "Buku & Alat Kuliah", "jual", "active", 96],
  ["Kos Putri Dekat Pintu 1 USU", 750_000, "Kos & Sewa", "sewa", "active", 540],
  ["iPhone 11 128GB Mulus", 3_900_000, "Elektronik", "jual", "active", 428],
  ["Sepeda Motor Beat 2019", 11_500_000, "Kendaraan", "jual", "pending", 71],
  ["Meja Belajar Lipat", 145_000, "Perabot", "jual", "active", 63],
  ["Jaket Almamater USU Ukuran L", 120_000, "Fashion", "jual", "sold", 188],
  ["Jasa Ketik & Print Skripsi", 5_000, "Jasa", "jasa", "active", 254],
  ["Monitor LG 22 inch IPS", 890_000, "Elektronik", "jual", "active", 141],
  ["Kalkulator Casio FX-991EX", 210_000, "Buku & Alat Kuliah", "jual", "active", 118],
  ["Kamar Kos AC Jl. Dr. Mansyur", 1_100_000, "Kos & Sewa", "sewa", "active", 397],
  ["Sepatu Futsal Specs Size 42", 175_000, "Fashion", "jual", "expired", 84],
  ["Printer Epson L3110 Second", 1_150_000, "Elektronik", "jual", "pending", 45],
  ["Rak Buku Susun 4 Tingkat", 230_000, "Perabot", "jual", "active", 57],
  ["Jasa Desain Poster Acara Kampus", 50_000, "Jasa", "jasa", "active", 132],
  ["Kemeja Kuliah Lengan Panjang", 95_000, "Fashion", "jual", "active", 76],
  ["Buku Akuntansi Dasar Polmed", 65_000, "Buku & Alat Kuliah", "jual", "sold", 103],
  ["Headset Gaming Rexus F22", 185_000, "Elektronik", "jual", "active", 166],
  ["Sepeda Lipat Element 20 inch", 1_750_000, "Kendaraan", "jual", "active", 209],
  ["Kipas Angin Berdiri Miyako", 175_000, "Perabot", "jual", "suspended", 38],
  ["Jasa Antar Jemput Area Kampus", 15_000, "Jasa", "jasa", "active", 91],
  ["Tas Ransel Eiger 25L", 285_000, "Fashion", "jual", "active", 122],
  ["Kos Putra Murah Padang Bulan", 550_000, "Kos & Sewa", "sewa", "pending", 61],
  ["Keyboard Mechanical Ajazz AK33", 320_000, "Elektronik", "jual", "active", 147],
];

const AREA = ["Padang Bulan", "Dr. Mansyur", "Simpang Kampus", "Jamin Ginting", "Setia Budi"];

export const listingsDemo = BARANG.map(([title, price, category, type, status, views], i) => {
  const p = PENJUAL[i % PENJUAL.length];
  const umur = 1 + i * 2;
  return {
    id: `demo-listing-${String(i + 1).padStart(2, "0")}`,
    listing_code: `USU${String(1001 + i)}`,
    seller_name: p.nama,
    seller_wa: wa(p.n),
    title,
    description:
      `${title}. Kondisi sesuai foto, bisa COD di sekitar kampus ${p.kampus}. ` +
      `Ini contoh isi untuk panel demo — barangnya tidak ada.`,
    price,
    stock: 1,
    category,
    type,
    image_url: null,
    images: [],
    status,
    featured: i % 9 === 0,
    featured_until: i % 9 === 0 ? nanti(5) : null,
    bumped_at: i % 4 === 0 ? lalu(1) : null,
    expires_at: status === "expired" ? lalu(3) : nanti(14 - (i % 10)),
    sold_price: status === "sold" ? price : null,
    sold_fee: status === "sold" ? Math.round(price * 0.02) : null,
    created_at: lalu(umur),
    updated_at: lalu(Math.max(0, umur - 1)),
    views,
    campus: p.kampus,
    area: AREA[i % AREA.length],
    seller_verified: i % 3 === 0,
    auto_bump_until: null,
    condition: i % 2 === 0 ? "Bekas — mulus" : "Bekas — layak pakai",
    sponsored_until: i === 3 ? nanti(7) : null,
    rental_period: type === "sewa" ? "bulan" : null,
    fee_offer: null,
    fee_offer_status: null,
    distributor_fee: null,
  };
});

const JENIS_BAYAR = ["iklan", "iklan", "bump", "sold_fee", "featured", "wanted", "subscribe", "renewal"];
export const paymentsDemo = Array.from({ length: 18 }, (_, i) => {
  const jenis = JENIS_BAYAR[i % JENIS_BAYAR.length];
  const nominal = { iklan: 2000, bump: 1000, sold_fee: 25_000, featured: 5000, wanted: 2000, subscribe: 49_000, renewal: 2000 }[jenis];
  const lunas = i % 3 !== 0;
  return {
    id: `demo-payment-${String(i + 1).padStart(2, "0")}`,
    listing_id: jenis === "wanted" || jenis === "subscribe" ? null : listingsDemo[i % listingsDemo.length].id,
    type: jenis,
    amount: nominal,
    status: lunas ? "paid" : "pending",
    midtrans_order_id: `DEMO-${jenis.toUpperCase()}-${1000 + i}`,
    meta: { final_amount: nominal, method: "manual" },
    created_at: lalu(i + 1),
  };
});

export const sellersDemo = PENJUAL.map((p, i) => ({
  wa: wa(p.n),
  name: p.nama,
  bio: `Mahasiswa ${p.kampus}. Contoh profil untuk panel demo.`,
  created_at: lalu(60 - i * 5),
  trusted_seller: i % 4 === 0,
  referral_code: `DEMO${p.n}${p.nama.slice(0, 2).toUpperCase()}`,
  free_bumps: i % 3,
  subscription_tier: i === 0 ? "pro" : "free",
  subscription_expires_at: i === 0 ? nanti(21) : null,
  pin: null,
  distributor: i === 1,
  slug: i < 3 ? p.nama.toLowerCase().split(" ")[0] : null,
  store_name: i < 3 ? `Toko ${p.nama.split(" ")[0]}` : null,
  tagline: i < 3 ? "Barang kampus, harga mahasiswa" : null,
  store_area: i < 3 ? AREA[i] : null,
  store_open: true,
  store_status: i === 0 ? "aktif" : i === 1 ? "menunggu" : i === 2 ? "ditolak" : "draf",
  store_requested_at: i < 3 ? lalu(4 - i) : null,
  store_approved_at: i === 0 ? lalu(3) : null,
  store_reject_note: i === 2 ? "Nama toko menyerempet merek yang sudah ada." : null,
  wa_verified: i % 2 === 0,
  blog_badge: i < 2,
  blog_badge_at: i < 2 ? lalu(10 + i) : null,
  totalListings: 3,
  activeListings: 2,
}));

export const blogsDemo = [
  {
    id: "demo-blog-1",
    slug: "cara-menawar-yang-sopan-demo",
    title: "Cara Menawar yang Sopan (dan Berhasil)",
    excerpt: "Menawar itu wajar. Yang bikin penjual kabur biasanya bukan angkanya, tapi caranya.",
    keywords: "tips menawar, jual beli mahasiswa",
    content_markdown: "## Mulai dari pertanyaan, bukan angka\n\nContoh isi artikel untuk panel demo.",
    image_url: null,
    author: "Aisyah Nabila",
    author_wa: wa(1),
    status: "published",
    reject_note: null,
    created_at: lalu(9),
    updated_at: lalu(9),
    submitted_at: lalu(9),
    reviewed_at: lalu(9),
  },
  {
    id: "demo-blog-2",
    slug: "checklist-sebelum-bayar-kos-demo",
    title: "Checklist Sebelum Bayar Uang Kos",
    excerpt: "Delapan hal yang harus dicek sebelum uang berpindah tangan.",
    keywords: "kos usu, tips kos",
    content_markdown: "## Cek air dulu, baru harga\n\nContoh isi artikel untuk panel demo.",
    image_url: null,
    author: "Bagas Pratama",
    author_wa: wa(2),
    status: "published",
    reject_note: null,
    created_at: lalu(6),
    updated_at: lalu(6),
    submitted_at: lalu(6),
    reviewed_at: lalu(6),
  },
  {
    id: "demo-blog-3",
    slug: "laptop-bekas-untuk-mahasiswa-demo",
    title: "Laptop Bekas untuk Mahasiswa: Apa yang Layak Dibeli",
    excerpt: "Prosesor lama bukan masalah. Baterai yang sudah menggembung, itu masalah.",
    keywords: "laptop bekas, elektronik kampus",
    content_markdown: "## Yang boleh tua, yang tidak boleh\n\nContoh isi artikel untuk panel demo.",
    image_url: null,
    author: "Citra Ramadhani",
    author_wa: wa(3),
    status: "menunggu",
    reject_note: null,
    created_at: lalu(1),
    updated_at: lalu(1),
    submitted_at: lalu(1),
    reviewed_at: null,
  },
  {
    id: "demo-blog-4",
    slug: "jualan-lewat-whatsapp-demo",
    title: "Jualan Lewat WhatsApp Tanpa Buka Website",
    excerpt: "Kirim foto ke bot, iklannya tayang. Begini urutannya.",
    keywords: "bot whatsapp, pasang iklan",
    content_markdown: "## Titik di depan perintah\n\nContoh isi artikel untuk panel demo.",
    image_url: null,
    author: "Dimas Kurniawan",
    author_wa: wa(4),
    status: "menunggu",
    reject_note: null,
    created_at: lalu(0),
    updated_at: lalu(0),
    submitted_at: lalu(0),
    reviewed_at: null,
  },
  {
    id: "demo-blog-5",
    slug: "promo-endorse-demo",
    title: "Promo Endorse Murah Hubungi Saya",
    excerpt: "Contoh tulisan yang ditolak admin.",
    keywords: "",
    content_markdown: "Isi promosi yang tidak relevan dengan pembaca.",
    image_url: null,
    author: "Elsa Wijaya",
    author_wa: wa(5),
    status: "ditolak",
    reject_note: "Isinya iklan jasa pribadi, bukan artikel yang berguna untuk pembaca.",
    created_at: lalu(4),
    updated_at: lalu(3),
    submitted_at: lalu(4),
    reviewed_at: lalu(3),
  },
  {
    id: "demo-blog-6",
    slug: "panduan-pasang-iklan-demo",
    title: "Panduan Pasang Iklan untuk Pemula",
    excerpt: "Dari foto sampai iklan tayang, dalam lima langkah.",
    keywords: "panduan, iklan",
    content_markdown: "## Foto dulu, tulis kemudian\n\nContoh isi artikel untuk panel demo.",
    image_url: null,
    author: "Admin",
    author_wa: null,
    status: "published",
    reject_note: null,
    created_at: lalu(20),
    updated_at: lalu(20),
    submitted_at: null,
    reviewed_at: null,
  },
];

export const wantedDemo = [
  { id: "demo-wanted-1", buyer_name: "Rani", buyer_wa: wa(21), title: "Cari kalkulator Casio FX-991", description: "Yang masih normal semua tombolnya.", budget: 200_000, category: "Buku & Alat Kuliah", campus: "USU", area: "Padang Bulan", status: "active", created_at: lalu(2), last_notified_at: null },
  { id: "demo-wanted-2", buyer_name: "Yoga", buyer_wa: wa(22), title: "Cari kos putra dekat Polmed", description: "Budget di bawah 700rb, kamar mandi dalam.", budget: 700_000, category: "Kos & Sewa", campus: "Polmed", area: "Simpang Kampus", status: "active", created_at: lalu(3), last_notified_at: lalu(2) },
  { id: "demo-wanted-3", buyer_name: "Sinta", buyer_wa: wa(23), title: "Cari sepeda bekas layak pakai", description: "Untuk keliling kampus.", budget: 900_000, category: "Kendaraan", campus: "USU", area: "Dr. Mansyur", status: "active", created_at: lalu(5), last_notified_at: null },
  { id: "demo-wanted-4", buyer_name: "Ilham", buyer_wa: wa(24), title: "Cari meja belajar", description: "Ukuran kecil muat di kamar kos.", budget: 250_000, category: "Perabot", campus: "Polmed", area: "Setia Budi", status: "closed", created_at: lalu(11), last_notified_at: lalu(9) },
];

export const reportsDemo = [
  { id: "demo-report-1", listing_id: listingsDemo[4].id, reason: "Harga tidak wajar", detail: "Harga jauh di bawah pasaran, mencurigakan.", reporter_wa: wa(31), status: "open", created_at: lalu(1) },
  { id: "demo-report-2", listing_id: listingsDemo[12].id, reason: "Foto bukan milik penjual", detail: "Fotonya diambil dari marketplace lain.", reporter_wa: wa(32), status: "open", created_at: lalu(2) },
  { id: "demo-report-3", listing_id: listingsDemo[19].id, reason: "Penjual tidak membalas", detail: "Sudah tiga hari tidak dibalas.", reporter_wa: wa(33), status: "resolved", created_at: lalu(8) },
];

export const ratingsDemo = [
  { id: "demo-rating-1", listing_id: listingsDemo[6].id, seller_wa: wa(1), rating: 5, comment: "Barang sesuai foto, penjualnya ramah.", buyer_name: "Nadia", created_at: lalu(3) },
  { id: "demo-rating-2", listing_id: listingsDemo[16].id, seller_wa: wa(3), rating: 4, comment: "Bagus, cuma agak lama balasnya.", buyer_name: "Reza", created_at: lalu(6) },
  { id: "demo-rating-3", listing_id: listingsDemo[1].id, seller_wa: wa(2), rating: 5, comment: "COD tepat waktu.", buyer_name: "Putri", created_at: lalu(10) },
  { id: "demo-rating-4", listing_id: listingsDemo[9].id, seller_wa: wa(4), rating: 3, comment: "Kondisi tidak semulus di foto.", buyer_name: "Andi", created_at: lalu(14) },
];

export const profileRequestsDemo = [
  { id: "demo-req-1", seller_wa: wa(5), field: "name", current_value: "Elsa W", requested_value: "Elsa Wijaya", status: "pending", requested_via: "dashboard", requested_at: lalu(1), reviewed_at: null, review_note: null },
  { id: "demo-req-2", seller_wa: wa(7), field: "bio", current_value: "-", requested_value: "Melayani COD area Polmed setiap sore.", status: "pending", requested_via: "bot", requested_at: lalu(2), reviewed_at: null, review_note: null },
  { id: "demo-req-3", seller_wa: wa(2), field: "name", current_value: "Bagas P", requested_value: "Bagas Pratama", status: "approved", requested_via: "dashboard", requested_at: lalu(9), reviewed_at: lalu(8), review_note: null },
];

/**
 * Bentuknya sengaja dibuat sama dengan getAdminStats(page, tab) — termasuk
 * yang dipotong per tab, supaya perilaku "tab ini tidak memuat tabel itu"
 * ikut terasa di demo.
 */
export function getDemoStats(page = 1, tab = null) {
  const stores = sellersDemo.filter((s) => s.slug);
  const pendingCount = listingsDemo.filter((l) => l.status === "pending").length;
  const revenue = paymentsDemo.filter((p) => p.status === "paid").reduce((t, p) => t + p.amount, 0);

  return {
    listings: listingsDemo,
    payments: paymentsDemo,
    blacklist: [],
    reports: reportsDemo,
    ratings: ratingsDemo,
    categories: KATEGORI,
    settings: DEFAULT_SETTINGS,
    wanted: wantedDemo,
    blogs: blogsDemo,
    penulisBadge: sellersDemo.filter((s) => s.blog_badge).map((s) => ({ wa: s.wa, name: s.name, blog_badge_at: s.blog_badge_at })),
    // BUKAN sellersDemo apa adanya. Tab "Penjual" membaca bentuk yang sudah
    // diringkas oleh getAdminStats — `seller_wa`, bukan `wa`, plus tiga
    // hitungan iklan. Versi pertama berkas ini menyodorkan baris profil mentah,
    // dan tabnya menjawab 500: `s.seller_wa.replace(...)` pada undefined.
    // Bentuk yang salah di data demo tidak terlihat sampai halamannya dibuka.
    sellersList: sellersDemo
      .map((sp) => {
        const miliknya = listingsDemo.filter((l) => l.seller_wa === sp.wa);
        return {
          seller_wa: sp.wa,
          seller_name: sp.name,
          total_iklan: miliknya.length,
          active_iklan: miliknya.filter((l) => l.status === "active").length,
          sold_iklan: miliknya.filter((l) => l.status === "sold").length,
          trusted_seller: sp.trusted_seller,
          subscription_tier: sp.subscription_tier,
        };
      })
      .sort((a, b) => b.total_iklan - a.total_iklan),
    stores,
    storesMigrationMissing: false,
    storesError: null,
    profileRequests: profileRequestsDemo,
    revenue,
    pendingCount,
    listingsTotal: listingsDemo.length,
    paymentsTotal: paymentsDemo.length,
    pwaInstallsTotal: 214,
    outboxPending: 2,
    currentPage: page,
    pageSize: 100,
  };
}

/** Bentuk yang sama dengan getOverviewStats() di src/lib/adminOverviewData.js. */
export function getDemoOverviewStats() {
  const aktif = listingsDemo.filter((l) => l.status === "active");
  const terjual = listingsDemo.filter((l) => l.status === "sold");
  const tertunda = listingsDemo.filter((l) => l.status === "pending");
  const lunas = paymentsDemo.filter((p) => p.status === "paid");

  const perCat = {};
  for (const l of aktif) perCat[l.category] = (perCat[l.category] || 0) + 1;

  const nilaiRating = ratingsDemo.reduce((t, r) => t + r.rating, 0);

  // Grafik 14 hari di Ringkasan membaca paidPayments — sebarkan supaya
  // batangnya tidak menumpuk di satu hari dan terlihat seperti bug.
  const paidPayments = lunas.map((p, i) => ({
    ...p,
    created_at: lalu(i % 14),
  }));

  return {
    listingsTotal: listingsDemo.length,
    paymentsTotal: paymentsDemo.length,
    pwaInstallsTotal: 214,
    activeTotal: aktif.length,
    soldTotal: terjual.length,
    pendingTotal: tertunda.length,
    openReportsTotal: reportsDemo.filter((r) => r.status === "open").length,
    revenue: lunas.reduce((t, p) => t + p.amount, 0),
    pendingPaymentCount: paymentsDemo.filter((p) => p.status === "pending").length,
    paidPayments,
    perCat,
    avgRating: ratingsDemo.length ? (nilaiRating / ratingsDemo.length).toFixed(1) : "0.0",
    totalRatings: ratingsDemo.length,
  };
}

/** Data untuk halaman Moderasi versi demo — bentuknya mengikuti ModerasiClient. */
export function getDemoModerasi() {
  const pendingListings = listingsDemo
    .filter((l) => l.status === "pending")
    .map(({ id, title, seller_wa, seller_name, price, category, image_url, created_at }) =>
      ({ id, title, seller_wa, seller_name, price, category, image_url, created_at }));

  const openReports = reportsDemo
    .filter((r) => r.status === "open")
    .map((r) => ({
      id: r.id,
      reason: r.reason,
      listing_id: r.listing_id,
      reporter_wa: r.reporter_wa,
      created_at: r.created_at,
      listings: { title: listingsDemo.find((l) => l.id === r.listing_id)?.title || "(iklan dihapus)" },
    }));

  const pendingProfiles = profileRequestsDemo
    .filter((p) => p.status === "pending")
    .map(({ id, seller_wa, field, current_value, requested_value, requested_at }) =>
      ({ id, seller_wa, field, current_value, requested_value, created_at: requested_at }));

  const pendingFees = paymentsDemo
    .filter((p) => p.type === "sold_fee" && p.status === "pending")
    .map((p) => ({
      id: p.id,
      amount: p.amount,
      listing_id: p.listing_id,
      created_at: p.created_at,
      listings: {
        title: listingsDemo.find((l) => l.id === p.listing_id)?.title || "(iklan dihapus)",
        seller_wa: listingsDemo.find((l) => l.id === p.listing_id)?.seller_wa || null,
      },
    }));

  return { pendingListings, openReports, pendingProfiles, pendingFees, pendingFeeOffers: [] };
}

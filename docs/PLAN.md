# Plan Pengembangan — Jual Beli USU/Polmed

Analisis dilakukan 2026-06-22 berdasarkan review kode lengkap seluruh project.

---

## URUTAN PENGERJAAN (ROI Tertinggi Dulu)

| # | Fitur | Estimasi | Dampak |
|---|---|---|---|
| 1 | **P2** — Banner peringatan batas PRO (12–14 iklan) | 30 menit | Revenue naik |
| 2 | **P1** — Sticky CTA bar di halaman produk | 1 jam | Konversi naik |
| 3 | **P9** — Wizard onboarding penjual baru | 1 jam | Retensi |
| 4 | **T1+T2** — Fix minor tampilan (bottom nav + dropdown aksi) | 30 menit | UX |
| 5 | **P3** — Strip "Baru Dilihat" di homepage | 1 jam | Engagement |
| 6 | **P4** — Filter kondisi barang (Baru/Bekas) | 2 jam | UX |
| 7 | **P6** — Tawaran harga in-app | 1 hari | Diferensiasi |
| 8 | **P7** — Langganan kategori via WA | 1 hari | Retensi buyer |
| 9 | **P8** — Sponsored listing | 1 hari | Revenue baru |

---

## DETAIL FITUR

### P1 — Sticky CTA Bar di Halaman Produk
- **File:** `src/app/produk/[slug]/page.jsx`
- **Apa:** Bar fixed bawah di mobile — "💬 Chat WA" (primer) dan "❤️ Simpan" (sekunder)
- **Kenapa:** CTA sekarang tidak dominant; banyak tombol tersebar tanpa 1 tombol besar yang jelas
- **Upaya:** Kecil — pure UI

### P2 — Banner Peringatan Batas PRO (12–14 iklan)
- **File:** `src/app/dashboard/page.jsx`
- **Apa:** Banner kuning muncul saat 12-14 iklan aktif: "Kamu sisa X slot iklan gratis. Upgrade PRO!"
- **Kenapa:** Penjual yang dekat batas tidak tahu sampai di-reject. Upsell natural.
- **Upaya:** Kecil — logic berdasarkan `active.length`

### P3 — Strip "Baru Dilihat" di Homepage
- **File:** `src/app/HomeBrowser.jsx`
- **Apa:** Horizontal scroll iklan yang pernah dibuka, dari localStorage
- **Kenapa:** Engagement — user sering kembali cek iklan sama. Zero backend cost.
- **Upaya:** Kecil — pure client side

### P4 — Filter Kondisi Barang (Baru/Bekas)
- **File:** `HomeBrowser.jsx`, `api/listings/browse/route.js`
- **Apa:** Tambah kolom `condition` di listings, filter di UI
- **Kenapa:** Filter paling umum di marketplace
- **Upaya:** Sedang — butuh SQL migration + UI

### P5 — Search Autocomplete
- **File:** `Navbar.jsx`, tambah API `/api/listings/suggest`
- **Apa:** 5 suggestion judul iklan saat user ketik di search bar
- **Upaya:** Sedang

### P6 — Tawaran Harga In-App
- **Apa:** Pembeli input harga tawar di halaman produk → seller dapat notif WA → terima/tolak
- **File baru:** tabel `offers`, `/api/offers`
- **Upaya:** Sedang

### P7 — Langganan Kategori via WA
- **Apa:** Tombol "🔔 Notifkan saya" di filter → user input nomor WA → dapat WA saat ada iklan baru sekategori
- **File baru:** tabel `category_subscriptions`, cron trigger
- **Upaya:** Sedang

### P8 — Sponsored Listing
- **Apa:** Penjual bayar Rp 5-10k/hari muncul di atas search results dengan label "Sponsor"
- **Kenapa:** Revenue baru, lebih granular dari Featured
- **Upaya:** Sedang — butuh `sponsored_until` di listings + UI label

### P9 — Wizard Onboarding Penjual Baru
- **File:** `src/app/dashboard/page.jsx`
- **Apa:** Saat 0 iklan, tampilkan step tracker 3 langkah, bukan halaman kosong
- **Upaya:** Kecil — pure UI

---

## PRIORITAS BESAR (Dikerjakan Belakangan)

### P10 — Konfirmasi COD In-Platform
- Buyer & seller klik "Tandai Sudah Bertemu" → notif WA ke keduanya → riwayat transaksi
- Butuh state machine transaksi baru

### P11 — Push Notification Browser
- Service Worker sudah ada, tinggal aktifkan push notif
- File: `public/sw.js`, tambah `/api/push/subscribe`

### P12 — Ulasan Per-Produk
- Rating sekarang per-penjual. Butuh ulasan per-iklan.
- Bergantung pada P10 (COD confirmed)

---

## PERBAIKAN TAMPILAN MINOR

| # | Masalah | File | Fix |
|---|---|---|---|
| T1 | Bottom nav "Dicari" pakai icon Grid (kurang tepat) | `BottomNav.jsx` | Ganti ke icon Search |
| T2 | Tombol aksi iklan di dashboard terlalu banyak | `dashboard/page.jsx` | Dropdown "..." per iklan |
| T3 | Related products: scroll horizontal di mobile | `produk/[slug]/page.jsx` | Grid 2x2 |
| T4 | Breadcrumb terpotong di mobile | `produk/[slug]/page.jsx` | Truncate + tooltip |
| T5 | Gambar WA Bot belum dikonversi ke WebP | `api/wa/baileys/route.js` | Kompresi sebelum upload |

---

## MONETISASI BARU

| Fitur | Harga | Status |
|---|---|---|
| Sponsored listing | Rp 5-10k/hari | Belum ada |
| Flash Sale badge (harga coret) | Rp 2k/event | Belum ada |
| Verified Store (cek KTP) | Rp 29k/bulan | Belum ada |
| Iklan banner per-kategori (UMKM) | Rp 50-100k/bulan | Belum ada |
| Paket PRO | Rp 49k/30 hari | ✅ Sudah ada |
| Featured | Rp 5-10k/hari | ✅ Sudah ada |
| Auto-bump 7 hari | Rp 15k | ✅ Sudah ada |
| Bump manual | Rp 1k | ✅ Sudah ada |

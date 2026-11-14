# Launch Plan: Kampus Kita Go-Live & Expansion

## 1. Cheap Real-World Validation Test (The "Pop-Up Booth & Free Boost" Test)
Sebelum mengeluarkan anggaran pemasaran besar, jalankan tes validasi 3 hari di kampus:
- **Lokasi Tes:** Kantin FISIP USU & Pendopo Gedung Kuliah Polmed.
- **Mekanisme:** Buka stan sederhana dengan banner cetak mini: *"Jual buku atau barang kosmu dalam 24 jam lewat WhatsApp."*
- **Penawaran Tes:** Mahasiswa yang memasang 1 barang bekas langsung mendapatkan gratis 1x fitur Broadcast Prioritas (nilai Rp 5.000).
- **Target Validasi:**
  - Minimal 30 listing terkumpul dalam 48 jam.
  - Minimal 12 barang (40%) berhasil ditawar atau laku dalam 3 hari.
  - Membuktikan secara nyata bahwa bot WhatsApp stabil dan pembeli merespons cepat.

---

## 2. Countdown to Grand Launch (T-Minus 14 Days)

| Hari | Target Kerja | Penanggung Jawab | Kriteria Selesai (DoD) |
|---|---|---|---|
| **D-14** | Audit Keamanan Bot & Server Azure | Tech Lead | Runbook deployment lulus uji beban 100 pesan/menit. |
| **D-10** | Cetak Stiker QR Titik COD Resmi | Marketing Lead | 100 stiker terpasang di Perpustakaan, Biro Rektor, & Mading Kos. |
| **D-7** | Rekrutmen 10 Mahasiswa Duta Kampus (Campus Ambassadors) | Community Lead | 10 mahasiswa aktif dari 5 fakultas berbeda sepakat memposting di status WA & IG Story. |
| **D-5** | Uji Coba Payment Gateway QRIS | Financial / Ops | Transaksi Rp 5.000 via QRIS BCA/GoPay/OVO langsung auto-approve di database. |
| **D-2** | Seeding 100 Listing Awal (Katalog Siap Buka) | Team Ops | Katalog web `kampuskita.my.id` sudah berisi 100 produk riil (buku, kipas, meja kos). |
| **D-1** | Freeze Code & Health Check Simultan | Tech Lead | Semua bot PM2 online, Vercel build status green, cron penjaga aktif. |
| **D-Day** | **GO-LIVE RESMI** | Seluruh Tim | Rilis serentak di Instagram `@jualbeliusupolmed`, blast grup angkatan, & aktivasi promo gratis. |

---

## 3. Launch Day Run Sheet (Hari-H Peluncuran)

- **07:00 WIB:** Cek status bot di Azure VPS via SSH (`pm2 status`). Pastikan socket WhatsApp terhubung (`isOnline: true`).
- **08:30 WIB:** Publikasi video utama peluncuran di Instagram Reels dan TikTok.
- **09:00 WIB:** 10 Duta Kampus serentak membagikan link katalog dan nomor bot ke grup angkatan masing-masing.
- **11:30 WIB:** Gelombang Broadcast Siang pertama: Kirim rekap 10 barang termurah hari ini ke grup WhatsApp.
- **14:00 WIB:** Pantau antrean moderasi (`/admin/antrean`) secara intensif; pastikan tidak ada delay approval.
- **18:00 WIB:** Evaluasi traffic web di analitik Vercel dan Supabase.
- **20:30 WIB:** Pengumuman hasil penjualan hari pertama di IG Story: sebutkan barang apa saja yang laku kilat.

---

## 4. The First 30 Days: Metrik yang Dipantau & Rencana Penyesuaian

| Metrik Kunci (KPI) | Target 30 Hari | Tindakan Jika Di Bawah Target | Tindakan Jika Melebihi Target |
|---|:---:|---|---|
| **Listing Aktif Baru / Hari** | > 15 listing | Berikan insentif koin gratis bagi yang mengajak teman pasang iklan. | Rekrut 1 moderator mahasiswa tambahan untuk menjaga SLA. |
| **Paket Terjual (Rp 12.000)** | > 5 paket / hari | Turunkan harga promo uji coba menjadi Rp 5.000 per blast. | Luncurkan paket langganan bulanan (*Monthly Pro Seller*). |
| **Tingkat Transaksi Laku (Success Rate)** | > 45% dalam 7 hari | Optimalkan judul iklan dan edukasi penetapan harga yang realistis ke penjual. | Jadikan testimoni penjualan sebagai bahan konten harian utama. |
| **Tingkat Komplain / Laporan Ghosting** | < 2% total transaksi | Pasang peringatan wajib verifikasi KTM sebelum transaksi barang elektronik. | Perluas titik COD resmi ke fakultas-fakultas lain. |

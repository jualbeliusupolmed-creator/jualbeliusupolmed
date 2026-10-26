# 📐 STANDARISASI DETAIL EKOSISTEM DIGITAL "KAMPUS KITA" (USU • POLMED)
> **Sistem Desain Resmi:** Kampusfess Ecosystem (`#047857` Forest Emerald, Soft Sage `#ECFDF5`, Plus Jakarta Sans, Radius 16px)  
> **Status Integrasi:** 100% Terstandarisasi dari Header / Navbar, Konten Utama, hingga Footer.

---

## 🏛️ 1. STANDAR BAKU TOP NAVBAR & APP BAR

### A. DESKTOP NAVBAR (Tinggi 64px — `h-16`, Sticky Top `z-50`, Bg White / 95% Blur, Border Bottom `#E2E8F0`)
Setiap halaman Desktop menggunakan satu struktur baku tanpa variasi:
1. **Brand Identity (Kiri):**
   - Logo Box: Emerald `#047857` dengan icon gedung/toko (`24x24`).
   - Teks Brand: `Kampus Kita` (Font 18px Bold `#0F172A`) + Subteks `USU • POLMED` (Font 11px Medium Emerald `#047857`).
   - Selector Kampus Terpadu: Pill dropdown `🎓 Kampus: USU` (atau `POLMED`) dengan chevron icon.
2. **Navigasi Utama (Tengah):**
   - Menu 5 Tab Resmi:
     - `Beranda` (`/`)
     - `Marketplace` (`/jual-beli`)
     - `Open PO` (`/open-po` dengan badge pill oranye `PO`)
     - `Menfess` (`/mading`)
     - `Obrolan` (`/chat` dengan counter badge ungu bulat `3`)
   - State Aktif: Teks Emerald `#047857`, font Semi-Bold, underline bar atau background sage halus `#ECFDF5`.
3. **Aksi & Profil (Kanan):**
   - Notifikasi Bell dengan indikator dot merah.
   - Tombol Utama: `+ Pasang Iklan` (Bg `#047857` Forest Emerald, teks putih bold, hover `#065F46`, radius 10px).
   - Avatar Profil: Lingkaran foto Faris Kurniawan + Badge centang hijau + Teks `Faris (FK '22)`.

### B. MOBILE TOP APP BAR & BOTTOM NAVIGATION (390px Mobile Frame)
1. **Top App Bar Mobile (Tinggi 56px):**
   - Kiri: Logo Icon + `Kampus Kita` & Chip Pill `USU • POLMED`.
   - Kanan: Icon Bantuan `?`, Pengaturan `⚙️`, dan Avatar Mahasiswa.
   - *(Pada Halaman Detail/Form: Tombol Back `←`, Judul Halaman Tengah, Tombol Share & Favorit di Kanan)*.
2. **Bottom Tab Navigation Mobile (Tinggi 64px, Sticky Bottom, 5 Menu Baku):**
   - Tab 1: `Beranda` (Icon Home)
   - Tab 2: `Marketplace` (Icon Storefront / Bag — **Bukan "Pasar" atau "Market"**)
   - Tab 3: `Open PO` (Icon Cup/Delivery)
   - Tab 4: `Menfess` (Icon Chat Bubble)
   - Tab 5: `Akun` (Icon User Avatar)

---

## 🔍 2. STANDARISASI KOMPONEN & KONTEN ANTARA

### A. Ticker / Marquee WTB (Dicari Mahasiswa):
- Bar horizontal auto-scroll halus dengan label aksen `LIVE WTB: Papan LED Laprak, Buku Kalkulus, Jas Lab, dll`.
- Lokasi konsisten tepat di bawah header pada Beranda Web & Mobile.

### B. Kartu Produk Marketplace (Preloved):
- Rasio foto 1:1 tajam dengan tag status pojok kiri atas: `KTM Terverifikasi` & `Siap COD`.
- Harga tebal format IDR: `Rp XX.000` + status negosiasi transparan (*Bisa Nego Tipis*).
- Lokasi titik temu kampus resmi: `📍 Pendopo USU / Pintu 2 / Kantin POLMED`.
- Aksi: Tombol `Chat WhatsApp Penjual` (Emerald) & `Kirim Pesan In-App`.

### C. Kartu Batch Open PO:
- Thumbnail makanan/minuman/merchandise dengan badge tanggal tutup batch (`Tutup 29 Okt`).
- Progress bar kuota slot terisi: e.g. `Terpesan: 17/30 (57%)`.
- Lokasi pickup spesifik di lingkungan kampus.

### D. Feed Menfess & Curhat Kampus:
- Desain kartu clean tanpa card header yang membingungkan.
- Identitas anonim terverifikasi kampus (`Anonim • USU` atau `POLMED`).
- Aksi interaksi: Upvote, Komentar, dan `Bagikan ke IG Story`.

---

## 🛡️ 3. STANDAR BAKU FOOTER EKOSISTEM (DESKTOP)

Seluruh halaman desktop memiliki footer 4-kolom yang identik:
- **Kolom 1 (Brand & Visi):** Logo `Kampus Kita`, badge `Terverifikasi NIM`, deskripsi platform nirlaba independen mahasiswa USU & POLMED.
- **Kolom 2 (Zona Titik COD Resmi):** Daftar titik kumpul aman kampus (Zona USU 1: Pendopo & Pintu 1; Zona USU 2: Fasilkom & Perpus; Zona POLMED: Gedung Z & Lapangan).
- **Kolom 3 (Protokol Keamanan):** Poin verifikasi identitas fisik, cek barang sebelum bayar, dan batas jam transaksi (08:00 - 18:30 WIB).
- **Kolom 4 (Legalitas & Hak Cipta):** Tautan Panduan Aman COD, Ketentuan Komunitas, Lapor Pelanggaran, dan Hak Cipta © 2026 Inisiatif Kolaboratif Mahasiswa.

---

## 🗺️ INDEKS LAYAR INTEGRASI LENGKAP
1. **Beranda Utama (Web & App):** `SCREEN_59` (Web) & `SCREEN_47` (App)
2. **Marketplace Katalog (Web & App):** `SCREEN_45` (Web) & `SCREEN_40` (App)
3. **Detail Produk & Janjian COD (Web & App):** `SCREEN_15` (Web) & `SCREEN_9` (App)
4. **Form Pasang Iklan Jual (Web):** `SCREEN_13` (Web)
5. **Dicari Mahasiswa / WTB Hub (Web):** `SCREEN_11` (Web)
6. **Etalase Open PO Batch (Web & App):** `SCREEN_37` (Web) & `SCREEN_35` (App)
7. **Mading & Suara Menfess (Web & App):** `SCREEN_33` (Web) & `SCREEN_31` (App)
8. **Obrolan & Swipe Kenalan (Web & App):** `SCREEN_24` (Web) & `SCREEN_22` (App)
9. **Akun & Profil Mahasiswa (Web & App):** `SCREEN_19` (Web) & `SCREEN_17` (App)

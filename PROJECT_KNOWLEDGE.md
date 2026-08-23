# PROJECT_KNOWLEDGE.md

Dokumen ini berisi peta pemahaman sistem, alur bisnis, daftar masalah, dan riwayat audit untuk proyek **Jual Beli USU Polmed**.

---

## 1. Peta Struktur Proyek & Inventarisasi

### Ekosistem Utama
Proyek ini mengadopsi arsitektur *Headless/Decoupled* dengan 3 pilar:
1. **Next.js (Web & Admin Panel)** -> *Frontend* dan *Webhook Receiver*. Berjalan di Vercel. Kodenya berada di repositori ini.
2. **Supabase (BaaS)** -> *Single Source of Truth* (Database + Auth). Menggunakan aturan RLS yang sangat ketat.
3. **Node.js WA Bot (`wa-bot-usu`)** -> *Background Worker* & Antarmuka Chat. Berjalan di VPS Linux. Bertugas bereaksi terhadap data di Supabase (seperti mengirim notifikasi WA).

### Struktur Folder Next.js
*   `src/app/`: Menggunakan App Router. 
    *   **Publik:** `/` (Home), `/produk`, `/toko`, `/jasa`, `/blog`, `/dicari`, `/kategori`, `/syarat-ketentuan`, `/kebijakan-privasi`, `/faq`.
    *   **Penjual:** `/jual`, `/edit`, `/dashboard`.
    *   **Admin:** `/admin` (panel admin terpusat), `/distributor`.
*   `src/app/api/`: Terdiri dari 22 endpoint REST API (*auth*, *config*, *cron*, *listings*, *payments*, *wa*, dll).
*   `src/components/`: Komponen UI (kini mengarah ke gaya desain minimalis/Tailwind).
*   `src/lib/`: Fungsi *helper* (`supabaseAdmin.js`, `adminData.js`, `rateLimit.js`, `settings.js`).
*   `supabase/migrations/`: Script SQL pendefinisi *database* (schema, RLS, functions).

### Skema Database (Supabase)
Berjalan dengan PostgreSQL, memiliki tabel-tabel berikut:
- `categories`: Master data kategori.
- `listings`: Tabel inti iklan/barang jualan.
- `payments`: Tabel pencatatan transaksi masuk (terintegrasi Midtrans).
- `seller_profiles`: Data toko / penjual.
- `wanted_listings`: Fitur "Barang Dicari".
- `blogs`: Sistem manajemen konten (artikel).
- `seller_ratings`: Sistem ulasan.
- `reports`: Laporan moderasi.
- `profile_change_requests`: Antrean persetujuan ubah nama/toko.
- `wa_outbox`: Antrean pesan untuk dikirim oleh Bot WA.
- `pwa_installs`: Analitik PWA.
- `blacklist`: Nomor WA yang di-banned.

---

## 2. Alur Bisnis (End-to-End)

### A. Alur Pemasangan Iklan Baru
1. **Trigger**: Penjual mengisi form di `/jual`.
2. **Proses Web**: Web melakukan POST ke `/api/listings`.
3. **Logika**: Sistem mengecek kuota gratis/berbayar via `settings`. Jika berbayar, membuat transaksi Midtrans.
4. **Data Berubah**: Baris baru di tabel `listings` (status `pending`) dan tabel `payments`.
5. **Side Effect**: Jika langsung aktif (gratis), memasukkan pesan notifikasi ke `wa_outbox`.
6. **Edge Case**: *Rate limit* mencegah spam submit. Jika penjual di-blacklist, API menolak dengan status HTTP khusus.

### B. Alur Pembayaran Transaksi (Midtrans)
1. **Trigger**: Pengguna membayar tagihan (Gopay/QRIS).
2. **Proses Web**: Midtrans mengirim webhook ke `/api/payments`.
3. **Logika**: API memvalidasi *signature* Midtrans. Jika valid, update tabel `payments` ke `paid`.
4. **Data Berubah**: Tabel `listings` di-update statusnya menjadi `active` (atau di-bump ke atas).
5. **Side Effect**: Webhook memasukkan pesan sukses ke `wa_outbox` untuk dikirim ke penjual. Bot di VPS kemudian mengirimkannya ke WhatsApp.

### C. Alur Pengiriman WhatsApp
1. **Trigger**: Ada data baru di `wa_outbox` (Supabase).
2. **Proses Bot (VPS)**: Script `index.js` di VPS melakukan *polling* atau mendengar *realtime webhook*.
3. **Logika**: Bot membaca nomor WA dan pesan, mengirimnya melalui pustaka Baileys.
4. **Data Berubah**: Status di `wa_outbox` berubah menjadi `terkirim` atau `gagal`.


### D. Alur Chat (Anonim & Marketplace) — Realtime
1. **Trigger**: Peserta mengirim pesan di `/chat`.
2. **Proses Web**: POST ke `/api/chat/room/[id]` (atau `/api/chat/marketplace/start` untuk pesan pembuka).
3. **Data Berubah**: Baris baru di `chat_messages`.
4. **Side Effect**: Server memanggil `siarkanPesanBaru()` (`src/lib/chatRealtime.js`) → broadcast event `pesan` di kanal `chat-room-<id>`. Klien yang mendengar lalu menarik ulang isi room lewat API yang memeriksa keanggotaan.
5. **Aturan penting**: Broadcast TIDAK PERNAH membawa isi pesan, hanya penanda `{refresh:true}`. Kebijakan RLS SELECT untuk `anon` sudah dicabut karena membuat seluruh isi chat terbaca siapa pun — data asli tidak boleh lewat kanal realtime.
6. **Edge Case**: Kalau broadcast gagal, permintaan TIDAK ikut gagal — pesan sudah aman di database dan klien masih punya polling 10 detik sebagai jaring pengaman.
7. **Prasyarat env**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` di Vercel tidak boleh ditandai **Sensitive**. Variabel Sensitive hanya terbaca di runtime server dan tidak pernah ter-*bake* ke bundel klien, sehingga realtime mati diam-diam tanpa galat build.

---

## 3. Keamanan & Eksposur

1. **Exposure Sensitif**: Kredensial aman (tidak ter-commit). Disimpan di `.env.local` dan dikelola di Vercel/VPS.
2. **Validasi Input & Otorisasi**: 
   - Row Level Security (RLS) di Supabase mencegah klien membaca data yang bukan haknya (misalnya, pembeli tidak bisa baca orderan penjual lain).
   - Akses admin di-handle via JWT dan pengecekan manual (`ADMIN_PASSWORD=bismillah` - *Perlu dievaluasi untuk diubah ke SSO/Email*).
3. **Rate Limiting**: Endpoint kritikal seperti pembuat iklan telah dilengkapi proteksi anti-spam lokal (*in-memory*).

---

## 4. Kualitas Kode & Utang Teknis (Tech Debt)

- [ ] **Kritis**: Script WA Bot di VPS (`index.js`) berukuran sangat membengkak (~215KB). Ini sangat berisiko (*Spaghetti code*) jika ada logic yang rusak, akan sulit ditelusuri. **Saran perbaikan**: Pecah `index.js` menjadi berbasis *controller/service* per modul (misal: `handler_transaksi.js`, `handler_admin.js`).
- [ ] **Menengah**: Sistem login Admin masih bersifat *hardcode* kata sandi di `.env` (bukan sistem User Management Supabase).
- [ ] **Peningkatan**: Desain panel admin sudah dibersihkan (rute redundan dihapus), namun perlu konsistensi desain (Dark mode / Light mode) yang merata di semua komponen UI.

---

## 5. Log & Riwayat Audit

*   **23 Agustus 2026** - *Chat realtime dituntaskan* - Dua akar berbeda ditutup: (1) `NEXT_PUBLIC_SUPABASE_ANON_KEY` ditandai Sensitive di Vercel sehingga tidak ter-bake ke bundel klien — diganti publishable key tanpa tanda Sensitive; (2) `/api/chat/room/[id]` menyimpan pesan tanpa menyiarkannya, sehingga hanya pesan pembuka yang terasa seketika dan semua balasan menunggu polling 10 detik. Pola broadcast disatukan ke `src/lib/chatRealtime.js` (sebelumnya cuma ada inline di `marketplace/start`).
*   **21 Agustus 2026** - *Audit Infrastruktur Menyeluruh* - Melakukan pemetaan sistem Web, Bot, dan Database. Menghapus rute `/admin/[tab]` yang redundan dan refactor `getAdminStats()`. Hasil audit didokumentasikan di file ini.

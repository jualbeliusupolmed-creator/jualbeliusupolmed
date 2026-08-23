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

### E. Matchmaking Chat Anonim — Asinkron, Bukan Harus Online Bersamaan (23 Agu 2026)
1. **Masalah lama**: Room tunggu dianggap "basi" kalau `updated_at` lebih tua dari 15 detik (lalu 45 detik). Ini menutup gejala "radar berputar selamanya", tapi TIDAK menutup akar masalahnya: dua orang yang cari teman di jam yang tidak tumpang tindih (A menunggu lalu pergi, B baru datang belakangan) tidak akan pernah dipertemukan, seberapa pun besar toleransinya.
2. **Solusi**: Heartbeat/staleness dibuang total dari `/api/chat/match`. Room tunggu (`status='waiting'`) sah dipasangkan kapan pun, tidak kedaluwarsa. `action:"poll"` sekarang murni baca (dulu ikut menulis + logika penjodohan sendiri).
3. **Push saat cocok belakangan**: Tabel `chat_identity_wa` (hash → WA, service-role only, TIDAK PERNAH keluar ke respons API) memetakan identitas anonim ke nomor asli HANYA untuk kebutuhan push. Begitu room tunggu seseorang diklaim, `pushToWa()` (`src/lib/webpush.js`, infrastruktur yang sama dengan notif listing baru) mengabari pemiliknya untuk kembali — walau tab sudah lama ditutup. Push cuma jalan kalau penerima sudah mengizinkan notifikasi peramban; kalau belum, dia tetap lihat hasilnya lain kali buka kotak masuk.
4. **`/chat` jadi kotak masuk**: bukan lagi formulir "klik cari → radar berputar → langsung 1 room". Obrolan anonim disematkan di atas (tombol "Cari Teman Baru" terpisah, dipencet — bukan otomatis), Chat Jual Beli di bawah, satu halaman (`src/app/chat/page.jsx`). Room tunggu tampil sebagai kartu "Menunggu partner..." di kotak masuk, bisa dibatalkan kapan saja. `/api/chat/anon/inbox` (GET) adalah sumbernya.
5. **Sesi tidak hilang, dan lebih kuat dari sebelumnya**: source of truth pindah dari localStorage (satu perangkat) ke server. Setiap room dibuka lewat `?room=<id>` di URL — refresh, tautan push, tab baru, semua menanyakan langsung ke API. Riwayat yang sudah `closed` pun tetap ada di kotak masuk.
6. **Bug yang ikut tertutup**: struktur tab lama (`mainTab` "random"/"marketplace") menggerbangi UI chat-room di balik kondisi yang salah — memilih room dari Chat Jual Beli, atau tautan `?room=` dari `OfferButton`/`MinatButton`, membuka layar **putih total** (UI room cuma dirender kalau `mainTab==='random'`, padahal kasus itu selalu `mainTab==='marketplace'`). Desain baru menghapus gerbang `mainTab` sepenuhnya — kelas bug ini terstruktur tidak bisa terjadi lagi.

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

*   **24 Agustus 2026 — Traffic Menfess, pseudonim, dan audit Cari Teman**
    - Migration `supabase/migrations/20260823194939_mading_engagement_anonymous_identity.sql` menambah hitungan tayangan unik dan bagikan Menfess, tabel engagement berisi hash bergaram (bukan IP/nomor mentah), serta kolom `seller_profiles.anonymous_name`.
    - Semua penulisan hitungan berjalan melalui API server dan fungsi `SECURITY INVOKER` yang hanya dapat dieksekusi `service_role`; tabel audit engagement tidak memiliki policy publik.
    - Pseudonim profil digunakan server-side untuk Menfess, komentar, dan room Cari Teman. Nama marketplace tidak otomatis terekspos dalam komunitas anonim.
    - Admin memiliki halaman Analitik Menfess dan Audit Cari Teman. Isi chat diperlakukan sebagai data privat; panel menampilkan pengingat akses hanya untuk moderasi/penanganan laporan.
    - Migration belum diterapkan ke produksi dalam perubahan kode ini; terapkan dan verifikasi melalui workflow Supabase yang disetujui sebelum mengaktifkan indikator traffic di Vercel.

*   **24 Agustus 2026 — Verifikasi kualitas web**
    - `npm run lint` bersih tanpa warning maupun error; dependency React Hooks pada halaman admin, marketplace, jasa, dan toko telah dirapikan.
    - `npm test` lulus 20/20. Build produksi lokal berhasil dibuat dengan PWA dinonaktifkan secara diagnostik (`DISABLE_PWA=true`); artefak `.next/BUILD_ID` dan manifest tersedia.

*   **24 Agustus 2026 — Snapshot operasional & audit read-only**
    - Web utama dan deployment Vercel merespons normal (`200`) dengan HSTS,
      CSP, `nosniff`, dan Permissions-Policy. Endpoint Railway yang pernah
      dicatat untuk bot menghasilkan fallback `404`; VPS/PM2 adalah jalur bot
      yang terverifikasi aktif sampai ada keputusan arsitektur baru.
    - VPS memiliki dua proses bot aktif di balik Nginx. Kapasitas saat audit
      memadai, tetapi restart bot perlu ditangani sebagai masalah reliabilitas:
      log menunjukkan putus koneksi WhatsApp dan reconnect berulang. Jangan
      menyertakan nomor, isi chat, atau session file dalam laporan debugging.
    - Worktree bot di VPS dan `bot-wa/` lokal memiliki perubahan yang belum
      dikomit. Tetapkan repo/commit canonical sebelum deploy atau sinkronisasi;
      jangan menimpa perubahan produksi.
    - RLS produksi belum tervalidasi karena konfigurasi koneksi database lokal
      tidak valid dan koneksi yang tersedia tidak mencapai tenant. Audit berikut
      harus menggunakan OAuth Supabase MCP read-only, lalu memeriksa tabel,
      policy, functions, Storage, Auth, dan Security Advisors.
    - Tes web: 20/20 lulus. Linter tidak memiliki error, namun terdapat
      peringatan dependency React Hooks yang perlu dibereskan bertahap.
    - Risiko prioritas: rahasia pernah berada di tempat yang tidak semestinya
      (remote Git/artefak dokumentasi lokal). Jangan catat nilainya di dokumen;
      lakukan rotasi melalui secret manager dan hapus artefaknya secara aman.

### Prioritas lanjutan

1. Rotasi seluruh rahasia yang pernah terekspos dan bersihkan artefak lokal/VPS.
2. Hubungkan Supabase, GitHub, dan Vercel melalui OAuth/read-only; hindari
   berbagi token di chat.
3. Putuskan jalur deployment bot canonical dan commit/review perubahan yang
   memang ingin dipertahankan.
4. Audit RLS produksi serta policy publik yang luas, terutama fitur tawaran,
   komentar, dan langganan.
5. Tambahkan pengujian bot, monitoring restart, dan runbook deploy/rollback.

*   **23 Agustus 2026** - *Chat realtime dituntaskan* - Dua akar berbeda ditutup: (1) `NEXT_PUBLIC_SUPABASE_ANON_KEY` ditandai Sensitive di Vercel sehingga tidak ter-bake ke bundel klien — diganti publishable key tanpa tanda Sensitive; (2) `/api/chat/room/[id]` menyimpan pesan tanpa menyiarkannya, sehingga hanya pesan pembuka yang terasa seketika dan semua balasan menunggu polling 10 detik. Pola broadcast disatukan ke `src/lib/chatRealtime.js` (sebelumnya cuma ada inline di `marketplace/start`).
*   **21 Agustus 2026** - *Audit Infrastruktur Menyeluruh* - Melakukan pemetaan sistem Web, Bot, dan Database. Menghapus rute `/admin/[tab]` yang redundan dan refactor `getAdminStats()`. Hasil audit didokumentasikan di file ini.

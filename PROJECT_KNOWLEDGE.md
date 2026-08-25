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
   - Akses admin di-handle via JWT dan secret environment `ADMIN_PASSWORD` (*Perlu dievaluasi untuk diubah ke SSO/Email*).
3. **Rate Limiting**: Endpoint kritikal seperti pembuat iklan telah dilengkapi proteksi anti-spam lokal (*in-memory*).

---

## 4. Kualitas Kode & Utang Teknis (Tech Debt)

- [ ] **Kritis**: Script WA Bot di VPS (`index.js`) berukuran sangat membengkak (~215KB). Ini sangat berisiko (*Spaghetti code*) jika ada logic yang rusak, akan sulit ditelusuri. **Saran perbaikan**: Pecah `index.js` menjadi berbasis *controller/service* per modul (misal: `handler_transaksi.js`, `handler_admin.js`).
- [ ] **Menengah**: Sistem login Admin masih bersifat *hardcode* kata sandi di `.env` (bukan sistem User Management Supabase).
- [ ] **Peningkatan**: Desain panel admin sudah dibersihkan (rute redundan dihapus), namun perlu konsistensi desain (Dark mode / Light mode) yang merata di semua komponen UI.

---

## 5. Log & Riwayat Audit

*   **25 Agustus 2026 — Arsitektur auto-post Instagram dua akun (database produksi aktif; kode menunggu deploy)**
    - Menfess diarahkan hanya ke `@usupolmedmenfess`; iklan marketplace berstatus aktif diarahkan hanya ke `@katalogusupolmed`. Akun umum `@usupolmedupdate` tidak dipakai oleh jalur otomatis.
    - Kredensial dipisah menjadi `META_MENFESS_IG_USER_ID` / `META_MENFESS_IG_ACCESS_TOKEN` dan `META_KATALOG_IG_USER_ID` / `META_KATALOG_IG_ACCESS_TOKEN`. Nilainya hanya boleh berada di secret manager server. Nama lama `META_IG_*` masih menjadi fallback Menfess selama transisi, bukan untuk katalog.
    - Generator katalog dan Menfess menghasilkan JPEG feed 4:5 (1080×1350). Foto sumber hanya diambil dari host Supabase proyek dan dibatasi ukuran; nomor WA serta identitas internal tidak dirender. Lampiran foto Menfess ikut masuk kartu Instagram bila valid.
    - Migration `20260825120507_instagram_dual_account_publishing.sql` menambah antrean katalog server-only, container ID, retry bertahap maksimal tiga kali, pemulihan worker basi, RLS tanpa policy publik, grant eksplisit `service_role`, dan trigger antrean saat konten berubah menjadi aktif.
    - Meta client memakai Graph API `v24.0` secara default, menunggu status container sebelum publish, mengirim token melalui header Authorization, dan memakai ulang container pada retry untuk mencegah post ganda. Cron harian tetap menjadi jalur pemulihan; request pembuatan/aktivasi normal mencoba publikasi langsung secara non-fatal.
    - Panel admin Menfess dan detail listing menampilkan status, jumlah percobaan, galat operasional, waktu terbit, serta tombol proses/coba lagi.
    - Migration diterapkan ke Supabase produksi dan tercatat sebagai versi `20260825120507`. Verifikasi setelah migrasi: kedua tabel ber-RLS, tidak dapat dibaca `anon`/`authenticated`, `service_role` memiliki CRUD, serta kedua trigger terpasang. Security Advisor tidak menemukan warning baru dari fitur ini; dua warning lama tetap berada pada fungsi `process_teman_swipe` dan harus ditangani terpisah.
    - Verifikasi lokal: seluruh 32 unit test lulus, lint bersih, build produksi bersih berhasil, endpoint pratinjau Menfess dan katalog merespons `200 image/jpeg`, dan kedua hasil diperiksa visual pada kanvas 1080×1350.
    - Environment Meta belum ada di Vercel pada saat verifikasi. Sampai empat variable akun tujuan diisi dan deployment diuji, konten hanya akan tersimpan dalam antrean—tidak ada post yang dikirim ke Instagram.

*   **25 Agustus 2026 — Desain generator Menfess Instagram aktif di produksi**
    - Generator JPEG Menfess memakai format feed 4:5 (1080×1350), latar ivory, tipografi adaptif, identitas `@usupolmedmenfess` yang halus, dan footer domain. Isi panjang diperkecil dan dipotong aman.
    - Plus Jakarta Sans Regular/SemiBold beserta lisensi OFL dibundel dan dirender melalui `sharp` `fontfile` agar hasil konsisten di Vercel Linux. Emoji yang tidak tersedia pada font dibersihkan hanya dari gambar; caption Instagram dan isi website tetap utuh.
    - Verifikasi: 25/25 tes lulus, lint bersih, build produksi berhasil, trace fungsi memuat kedua TTF, serta JPEG produksi diperiksa visual. Smoke test domain utama menghasilkan `200 image/jpeg` berukuran 1080×1350 tanpa huruf atau emoji kotak.
    - Commit desain `d596901`, bundling font `d01636b`, dan pembersihan emoji `a5c82d0` sudah didorong ke `main`. Deployment produksi berstatus `READY` dan menguasai `jualbeliusupolmed.vercel.app`, `www.jualbeliusupolmed.web.id`, serta domain apex.
    - Folder lokal sudah ditautkan ulang ke proyek produksi pada scope `jualbeliusupolmed-creators-projects`; verifikasi scope tetap wajib sebelum deployment berikutnya.

*   **25 Agustus 2026 — Antrean publikasi Instagram Menfess generasi pertama (digantikan arsitektur dua akun di atas)**
    - Menfess yang sudah aktif dapat diterbitkan langsung oleh admin melalui tombol `Terbitkan IG`; sistem tetap memakai antrean dan lock status untuk mencegah publikasi ganda. Scheduler server menjadi jalur cadangan untuk antrean yang belum diproses.
    - Token dan ID akun Instagram tidak disimpan di database maupun kode. Nama environment generasi pertama `META_IG_ACCESS_TOKEN` dan `META_IG_USER_ID` kini hanya fallback transisi untuk akun Menfess.
    - Endpoint gambar Menfess menghasilkan JPEG publik khusus Instagram agar Menfess teks dapat diposting tanpa mengekspos identitas internal pengirim.
    - Migration `20260824192759_mading_instagram_publication_queue.sql` harus direview dan diterapkan sebelum kode ini dideploy. Cron dijadwalkan sekali sehari agar kompatibel dengan batas Vercel Hobby; frekuensi dapat ditingkatkan setelah paket Vercel diverifikasi.

*   **25 Agustus 2026 — Tampilan feed Menfess & balasan komentar (belum dimigrasikan di produksi)**
    - Feed `/mading` memakai daftar datar yang sama dengan cuplikan Menfess di Beranda; fungsi laporan, view, share, dan komentar tetap tersedia.
    - Balasan komentar satu tingkat memakai `mading_comments.parent_id`, dengan validasi bahwa induk berasal dari post yang sama dan bukan balasan lain. Migration `20260824194256_mading_comment_replies.sql` harus diterapkan sebelum fitur reply digunakan di produksi.

*   **24 Agustus 2026 — Owner Fast Actions, Photo Attachments & Realtime Typing Indicators**
    - **Panel Aksi Cepat Pemilik (`OwnerFastActions.jsx`)**: Menampilkan panel kontrol khusus saat penjual membuka halaman iklannya sendiri di `/produk/[slug]` (`[✏️ Edit Iklan]`, `[✅ Tandai Terjual]`, `[🚀 Sundul / Bump]`, `[📊 Dashboard]`).
    - **Lampiran Foto di Chat & DM (`/chat`)**: Input obrolan dilengkapi tombol `[📷]` yang terintegrasi dengan `/api/upload` dan Lightbox modal interaktif untuk memperbesar foto.
    - **Realtime Typing Indicator**: Supabase Realtime broadcast event `typing` menampilkan animasi gelembung titik membal saat lawan bicara sedang mengetik pesan.
    - **Kombinasi Tombol Akun Navbar**: Menggabungkan tombol Masuk & Dashboard menjadi satu pil status akun cerdas di `Navbar.jsx`.
    - **Kepadatan Tampilan Beranda**: Merapikan padding dan margin vertikal hero bar di `SuperAppHome.jsx`.

*   **24 Agustus 2026 — Fitur Lanjut DM Pribadi Terintegrasi di Website & Panel Admin**
    - **Lanjut DM Pribadi Saling Setuju (Mutual Consent Website DM)**: Fitur "Lanjut DM" di Cari Teman (`type: 'random'`). Saat kedua pihak saling setuju, sistem membuat ruang DM 1-on-1 permanen (`type: 'direct'`) di website dengan identitas profil asli pengguna.
    - **Integrasi Kotak Masuk Pengguna**: Ruang DM muncul otomatis di kotak masuk akun (`/chat`) dengan kartu profil, fakultas, dan badge `💬 DM Pribadi`.
    - **Integrasi Panel Admin**: Admin panel (`/admin/obrolan`) memiliki tab filter `💬 DM Pribadi` (`type=direct`), badge identitas pengguna 1 ↔ 2, tautan profil, serta log pesan lengkap untuk moderasi.
    - **Notifikasi WA Kontak Pertama**: Notifikasi WhatsApp ke penjual hanya dikirim 1 kali saat pembeli pertama kali menghubungi barang di `POST /api/chat/marketplace/start`.
    - **Notifikasi Suara & Quick Reply**: Web Audio API notifikasi (`playChatSound()`, `playSentSound()`) dan kartu balasan langsung in-app.

*   **24 Agustus 2026 — Traffic Menfess, pseudonim, dan audit Cari Teman**
    - Migration `supabase/migrations/20260823194939_mading_engagement_anonymous_identity.sql` menambah hitungan tayangan unik dan bagikan Menfess, tabel engagement berisi hash bergaram (bukan IP/nomor mentah), serta kolom `seller_profiles.anonymous_name`.
    - Semua penulisan hitungan berjalan melalui API server dan fungsi `SECURITY INVOKER` yang hanya dapat dieksekusi `service_role`; tabel audit engagement tidak memiliki policy publik.
    - Pseudonim profil digunakan server-side untuk Menfess, komentar, dan room Cari Teman. Nama marketplace tidak otomatis terekspos dalam komunitas anonim.
    - Admin memiliki halaman Analitik Menfess dan Audit Cari Teman. Isi chat diperlakukan sebagai data privat; panel menampilkan pengingat akses hanya untuk moderasi/penanganan laporan.
    - Migration diterapkan dan diverifikasi di Supabase produksi pada 24 Agustus 2026. Kolom foto/traffic dan pseudonim sudah ada; tabel engagement memakai RLS. Hak eksekusi fungsi engagement telah ditegaskan hanya untuk `service_role` (anon/authenticated ditolak), dan Security Advisors tidak menemukan isu pada level warning.

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

*   **24 Agustus 2026 — Peluncuran Fitur "Cari Teman Kampus" (Swipe Match ala Dating App) & Moderasi Admin**
    - **Frontend (`/teman`, `/swap`, `/cari-teman`):** Dibangun dengan kartu swipe interaktif berbasis touch/mouse drag gesture dengan efek stamp *LIKE 💚* / *PASS ❌*, undo/rewind, dan perayaan *Mutual Match Pop-up*.
    - **Aturan Foto Wajib:** Onboarding modal mewajibkan 1 foto profil sebelum pengguna dapat membuka deck swiping. Foto otomatis dikompresi ke WebP hemat bandwidth.
    - **Backend & Database:** Skema `teman_profiles`, `teman_swipes`, `teman_matches`, dan fungsi RPC PostgreSQL atomik `process_teman_swipe`.
    - **Integrasi Menyeluruh:** Diintegrasikan pada Capsule Bar & Hero Banner Beranda, Navigasi Utama Navbar, Bottom Navbar matcher, dan Banner Pusat Obrolan.
    - **Panel Moderasi Admin (`/admin/teman`):** Menampilkan metrik real-time profil aktif, total swipe, mutual match, serta kontrol aktifkan/nonaktifkan dan hapus akun.

    - Endpoint gambar Menfess menghasilkan JPEG publik khusus Instagram agar Menfess teks dapat diposting tanpa mengekspos identitas internal pengirim.
    - Migration `20260824192759_mading_instagram_publication_queue.sql` harus direview dan diterapkan sebelum kode ini dideploy. Cron dijadwalkan sekali sehari agar kompatibel dengan batas Vercel Hobby; frekuensi dapat ditingkatkan setelah paket Vercel diverifikasi.

*   **25 Agustus 2026 — Tampilan feed Menfess & balasan komentar (belum dimigrasikan di produksi)**
    - Feed `/mading` memakai daftar datar yang sama dengan cuplikan Menfess di Beranda; fungsi laporan, view, share, dan komentar tetap tersedia.
    - Balasan komentar satu tingkat memakai `mading_comments.parent_id`, dengan validasi bahwa induk berasal dari post yang sama dan bukan balasan lain. Migration `20260824194256_mading_comment_replies.sql` harus diterapkan sebelum fitur reply digunakan di produksi.

*   **24 Agustus 2026 — Owner Fast Actions, Photo Attachments & Realtime Typing Indicators**
    - **Panel Aksi Cepat Pemilik (`OwnerFastActions.jsx`)**: Menampilkan panel kontrol khusus saat penjual membuka halaman iklannya sendiri di `/produk/[slug]` (`[✏️ Edit Iklan]`, `[✅ Tandai Terjual]`, `[🚀 Sundul / Bump]`, `[📊 Dashboard]`).
    - **Lampiran Foto di Chat & DM (`/chat`)**: Input obrolan dilengkapi tombol `[📷]` yang terintegrasi dengan `/api/upload` dan Lightbox modal interaktif untuk memperbesar foto.
    - **Realtime Typing Indicator**: Supabase Realtime broadcast event `typing` menampilkan animasi gelembung titik membal saat lawan bicara sedang mengetik pesan.
    - **Kombinasi Tombol Akun Navbar**: Menggabungkan tombol Masuk & Dashboard menjadi satu pil status akun cerdas di `Navbar.jsx`.
    - **Kepadatan Tampilan Beranda**: Merapikan padding dan margin vertikal hero bar di `SuperAppHome.jsx`.

*   **24 Agustus 2026 — Fitur Lanjut DM Pribadi Terintegrasi di Website & Panel Admin**
    - **Lanjut DM Pribadi Saling Setuju (Mutual Consent Website DM)**: Fitur "Lanjut DM" di Cari Teman (`type: 'random'`). Saat kedua pihak saling setuju, sistem membuat ruang DM 1-on-1 permanen (`type: 'direct'`) di website dengan identitas profil asli pengguna.
    - **Integrasi Kotak Masuk Pengguna**: Ruang DM muncul otomatis di kotak masuk akun (`/chat`) dengan kartu profil, fakultas, dan badge `💬 DM Pribadi`.
    - **Integrasi Panel Admin**: Admin panel (`/admin/obrolan`) memiliki tab filter `💬 DM Pribadi` (`type=direct`), badge identitas pengguna 1 ↔ 2, tautan profil, serta log pesan lengkap untuk moderasi.
    - **Notifikasi WA Kontak Pertama**: Notifikasi WhatsApp ke penjual hanya dikirim 1 kali saat pembeli pertama kali menghubungi barang di `POST /api/chat/marketplace/start`.
    - **Notifikasi Suara & Quick Reply**: Web Audio API notifikasi (`playChatSound()`, `playSentSound()`) dan kartu balasan langsung in-app.

*   **24 Agustus 2026 — Traffic Menfess, pseudonim, dan audit Cari Teman**
    - Migration `supabase/migrations/20260823194939_mading_engagement_anonymous_identity.sql` menambah hitungan tayangan unik dan bagikan Menfess, tabel engagement berisi hash bergaram (bukan IP/nomor mentah), serta kolom `seller_profiles.anonymous_name`.
    - Semua penulisan hitungan berjalan melalui API server dan fungsi `SECURITY INVOKER` yang hanya dapat dieksekusi `service_role`; tabel audit engagement tidak memiliki policy publik.
    - Pseudonim profil digunakan server-side untuk Menfess, komentar, dan room Cari Teman. Nama marketplace tidak otomatis terekspos dalam komunitas anonim.
    - Admin memiliki halaman Analitik Menfess dan Audit Cari Teman. Isi chat diperlakukan sebagai data privat; panel menampilkan pengingat akses hanya untuk moderasi/penanganan laporan.
    - Migration diterapkan dan diverifikasi di Supabase produksi pada 24 Agustus 2026. Kolom foto/traffic dan pseudonim sudah ada; tabel engagement memakai RLS. Hak eksekusi fungsi engagement telah ditegaskan hanya untuk `service_role` (anon/authenticated ditolak), dan Security Advisors tidak menemukan isu pada level warning.

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

*   **24 Agustus 2026 — Peluncuran Fitur "Cari Teman Kampus" (Swipe Match ala Dating App) & Moderasi Admin**
    - **Frontend (`/teman`, `/swap`, `/cari-teman`):** Dibangun dengan kartu swipe interaktif berbasis touch/mouse drag gesture dengan efek stamp *LIKE 💚* / *PASS ❌*, undo/rewind, dan perayaan *Mutual Match Pop-up*.
    - **Aturan Foto Wajib:** Onboarding modal mewajibkan 1 foto profil sebelum pengguna dapat membuka deck swiping. Foto otomatis dikompresi ke WebP hemat bandwidth.
    - **Backend & Database:** Skema `teman_profiles`, `teman_swipes`, `teman_matches`, dan fungsi RPC PostgreSQL atomik `process_teman_swipe`.
    - **Integrasi Menyeluruh:** Diintegrasikan pada Capsule Bar & Hero Banner Beranda, Navigasi Utama Navbar, Bottom Navbar matcher, dan Banner Pusat Obrolan.
    - **Panel Moderasi Admin (`/admin/teman`):** Menampilkan metrik real-time profil aktif, total swipe, mutual match, serta kontrol aktifkan/nonaktifkan dan hapus akun.

### 📌 Roadmap & Backlog Pengembangan Lanjutan (Cari Teman & Swap)
1. **Notifikasi WhatsApp Otomatis saat Match:** Begitu terjadi mutual like (match), Bot WhatsApp (Fonnte/Baileys) otomatis mengirim pesan WA ke kedua belah pihak dengan link sapaan instan.
2. **Centang Biru Verifikasi Mahasiswa (Verified Student Badge):** Verifikasi identitas mahasiswa USU/Polmed via upload KTM atau email institusi (`@students.usu.ac.id` / `@polmed.ac.id`).
3. **Icebreaker Prompts Khas Kampus:** Kartu pertanyaan interaktif ala Hinge (contoh: *Tempat ngopi favorit sekitar Mansyur/Padang Bulan*, *Red flag anak kampus*, *Lagu Spotify favorit*).
4. **Modul Tukar Jadwal Kuliah / Praktikum (KRS & Shift Swap Matrix):** Fitur auto-matching jadwal bentrok matkul/kelas saat awal semester.
5. **Fitur Monetisasi Mikro (Boost Profil & Lihat Siapa yang Like Kamu):** Paket top-up hemat via QRIS (Rp 3.000–5.000) untuk spotlight profil dan intip likers.

*   **26 Agustus 2026** - *Fitur Unduh Menfess (Potrait & Landscape) & Ekosistem Akun Resmi UKM / Organisasi Kampus*
    - **Unduh Menfess Visual (`src/components/mading/UnduhMenfessModal.jsx`, `src/lib/madingInstagramImage.js`):** Menambahkan tombol Unduh tepat di samping tombol Bagikan di setiap kartu Menfess. Pengguna dapat memilih 2 opsi rasio: **Potrait (1080×1350 / 4:5)** untuk Instagram Feed & Story, dan **Landscape (1200×675 / 16:9)** untuk Twitter/Status WhatsApp. Menghasilkan file gambar JPG HD instan tanpa watermark mengganggu.
    - **Akun Khusus Organisasi & UKM Kampus (`/organisasi`, `/organisasi/daftar`, `src/lib/organisasi.js`):**
      - **Badging:** Lencana resmi terverifikasi `🏛️ Resmi Terverifikasi` untuk BEM, HIMA, dan UKM di USU & POLMED.
      - **Direktori Publik (`/organisasi`):** Halaman eksplorasi daftar UKM dan Organisasi dengan filter kategori (BEM/HIMA, Olahraga, Seni, Riset, Keagamaan, Pers) dan kampus.
      - **Tautan Pendaftaran Private (`/organisasi/daftar?invite=...`):** Formulir pendaftaran khusus pengurus organisasi dengan verifikasi token invite, upload logo WebP, dan auto-session login.
      - **Panel Admin:** Pengaturan kode undangan private organisasi dan tombol salin tautan instan di tab Pengaturan Admin.
      - **Feed Mading Organisasi:** Tab `🏛️ Organisasi` di Mading untuk pengumuman resmi, oprec kepanitiaan, dan info kegiatan UKM.
    - **Sistem Formulir Oprec In-App (`/oprec`, `src/components/oprec/OprecDaftarModal.jsx`, `src/components/oprec/BuatOprecModal.jsx`):**
      - **Pusat Oprec Kampus (`/oprec`):** Direktori lowongan kepanitiaan acara, staf BEM/HIMA, dan keanggotaan UKM dengan countdown sisa hari pendaftaran.
      - **Formulir Pendaftaran Mahasiswa:** Modal in-app untuk submit data (Nama, NIM, Kampus, Fakultas, Angkatan, Divisi Pilihan 1 & 2, Alasan/Portofolio) dan langsung diarahkan ke grup WhatsApp peserta.
      - **Pembuatan Oprec Dinamis:** Pengurus UKM dapat membuka oprec dengan konfigurasi divisi dinamis, deadline, dan link grup WhatsApp.
      - **Tabel Database & Migration (`supabase/migration_oprec.sql`):** Tabel `oprec_events` dan `oprec_submissions` dengan RLS policies.

*   **26 Agustus 2026** - *Pembaruan Statistik Dashboard Penjual (Seller Analytics & Performance Matrix)*
    - **Komponen (`src/components/dashboard/SellerAnalyticsView.jsx`):** Menghadirkan antarmuka analitik modern dengan 6 KPI Cards (Total Views, Omset Terjual GMV, Nilai Aset Aktif, Konversi %, Tawaran Masuk, Rating Kepuasan Pembeli).
    - **Smart Insights AI:** Rekomendasi otomatis berbasis kondisi barang (deteksi iklan yang posisinya turun dan butuh disundul, peringatan tawaran masuk yang belum direspon, analisis performa kategori terpopuler).
    - **Visual Distribusi Kategori:** Bar meter interaktif persentase tayangan per kategori barang.
    - **Tabel Performa Per Iklan Interaktif:** Pencarian judul instan, saringan status (Aktif/Terjual/Expired), pengurutan dinamis (views, tawaran, harga, tanggal), bar popularitas relatif, serta aksi cepat (Lihat, Sundul, Bagikan).
    - **Ekspor CSV:** Tombol ekspor rekapitulasi data penjualan ke format CSV untuk pembukuan mandiri penjual.
    - **Backend API (`/api/analytics/seller`):** Agregasi paralel data `listings`, `price_offers`, dan `seller_ratings` dengan kalkulasi omset, konversi, rata-rata tayangan per hari, dan rate limiting 60 req/menit.

*   **25 Agustus 2026** - *Login 1-Klik Google OAuth & Popup Iklan Sponsor/Event Kampus*
    - **Google OAuth (`src/components/OTPModal.jsx`, `src/app/auth/callback/route.js`):** Menambahkan tombol "Masuk dengan Google" (ikon SVG 4-warna) di modal login/daftar di bawah semua mode (WA & Email). Route callback `/auth/callback` menukar `code` Supabase → sesi user, mencari/membuat profil di `seller_profiles` berdasarkan kolom `email_google`, lalu menyetel kuki `seller_session` HMAC 30 hari yang kompatibel penuh dengan sistem WA/Email yang sudah ada. Identifier user Google: `google_{localpart}_{timestamp36}`.
    - **Kolom DB baru:** `seller_profiles.email_google TEXT UNIQUE`, `seller_profiles.auth_provider TEXT DEFAULT 'wa'`.
    - **Sinkronisasi localStorage:** `LayoutWrapper.jsx` mendeteksi `?_gwa=` setelah redirect dan menyimpannya ke `localStorage.seller_wa`, kemudian membersihkan URL.
    - **Google Cloud Console:** Project `jual-beli-usu-polmed`, Client ID disimpan di Supabase Auth. Authorized redirect URI: `https://autgrnrqeqdpqwkbolyh.supabase.co/auth/v1/callback`. Supabase Site URL: `https://jualbeliusupolmed.web.id`.
    - **Popup Iklan Sponsor (`src/components/PopupSponsor.jsx`, `src/lib/settings.js`):** Komponen popup muncul 1× per 24 jam (cek `localStorage.popup_sponsor_last_seen`). Dikonfigurasi lewat Admin → Pengaturan → "Popup Iklan Sponsor / Event Kampus" (toggle aktif, judul, URL gambar, link tujuan, teks tombol CTA). Disimpan di `settings` Supabase dengan kunci `popupAd`.

*   **24 Agustus 2026** - *Fresh Canvas Cari Temen & Penyempurnaan Obrolan Mobile/PC* - (1) Mengubah tampilan Cari Temen (`/chat?anon=1`) menjadi sistem Fresh Canvas: hanya merender sesi percakapan yang sedang aktif sehingga tumpukan riwayat obrolan masa lalu (divider, pesan keluar) tidak lagi mencemari obrolan baru. Riwayat lama dapat diakses melalui accordion non-intrusif. (2) Menambahkan layar radar matching interaktif saat antrean dan banner interaktif saat teman meninggalkan percakapan. (3) Menghapus double bottom padding di `LayoutWrapper` khusus rute obrolan dan menyempurnakan responsivitas container di mobile (`100dvh`, safe area) dan desktop card (Apple HIG border & shadow). (4) Toggle Global Mode Transaksi & fix constraint direct chat type.
*   **23 Agustus 2026** - *Chat realtime dituntaskan* - Dua akar berbeda ditutup: (1) `NEXT_PUBLIC_SUPABASE_ANON_KEY` ditandai Sensitive di Vercel sehingga tidak ter-bake ke bundel klien — diganti publishable key tanpa tanda Sensitive; (2) `/api/chat/room/[id]` menyimpan pesan tanpa menyiarkannya, sehingga hanya pesan pembuka yang terasa seketika dan semua balasan menunggu polling 10 detik. Pola broadcast disatukan ke `src/lib/chatRealtime.js` (sebelumnya cuma ada inline di `marketplace/start`).
*   **21 Agustus 2026** - *Audit Infrastruktur Menyeluruh* - Melakukan pemetaan sistem Web, Bot, dan Database. Menghapus rute `/admin/[tab]` yang redundan dan refactor `getAdminStats()`. Hasil audit didokumentasikan di file ini.

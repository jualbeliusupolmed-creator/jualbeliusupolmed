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
   - Akses admin di-handle via JWT dan secret environment `ADMIN_PASSWORD`. Login/logout admin kini **dicatat ke `admin_logs`** (IP + timestamp + hasil) sejak 28 Agustus 2026.
   - `ADMIN_PASSWORD` wajib minimal 16 karakter di production (divalidasi startup).
   - `SESSION_SECRET` tersedia sebagai kunci terpisah untuk sesi penjual — **wajib diisi di Vercel** agar ganti `ADMIN_PASSWORD` tidak membatalkan sesi penjual.
3. **Rate Limiting**: Endpoint kritikal seperti pembuat iklan telah dilengkapi proteksi anti-spam lokal (*in-memory*).

---

## 4. Kualitas Kode & Utang Teknis (Tech Debt)

- [ ] **Kritis**: Script WA Bot di VPS (`index.js`) berukuran sangat membengkak (~215KB). Ini sangat berisiko (*Spaghetti code*) jika ada logic yang rusak, akan sulit ditelusuri. **Saran perbaikan**: Pecah `index.js` menjadi berbasis *controller/service* per modul (misal: `handler_transaksi.js`, `handler_admin.js`).
- [x] **Menengah (sebagian)**: Login Admin tetap berbasis `ADMIN_PASSWORD` di `.env`, tapi kini diperkuat: (a) validasi panjang ≥16 karakter, (b) audit log login/logout ke `admin_logs`, (c) `SESSION_SECRET` terpisah dari `ADMIN_PASSWORD`. Migrasi ke SSO Supabase tetap backlog jangka panjang.
- [ ] **Peningkatan**: Desain panel admin sudah dibersihkan (rute redundan dihapus), namun perlu konsistensi desain (Dark mode / Light mode) yang merata di semua komponen UI.

---

### F. Sesi Pengguna — Satu Sumber, Satu Kali Masuk (28 Agu 2026)

Kebenaran sesi ada di kuki `seller_session`: httpOnly, bertanda tangan HMAC,
**30 hari** (`lib/auth.js`). Tapi yang dibaca antarmuka selama ini
`localStorage.seller_wa` — sepuluh berkas membacanya untuk menentukan "siapa
yang sedang memakai ini".

**Akar keluhan "disuruh login berkali-kali".** Kedua nilai itu bisa berbeda,
dan yang paling sering: kuki masih sah, localStorage kosong (peranti baru,
riwayat peramban dibersihkan, mode privat). Navbar sudah memanggil
`/api/auth/me` dan **tahu** nomor yang benar — tapi cabang `loggedIn`-nya tidak
pernah menulis balik ke localStorage; hanya cabang `else` yang menyentuhnya
(untuk menghapus). Jadi pengguna melihat namanya di pojok kanan atas, lalu
menekan **Jual** dan dihadang modal masuk. `/jual` membandingkan
`localStorage.seller_wa !== formattedWa`, dan string kosong tidak akan pernah
sama dengan nomor mana pun.

**Aturannya sekarang** — `components/SesiProvider.jsx`, dipasang di
`LayoutWrapper`:

1. Kuki tetap satu-satunya kebenaran; localStorage cuma **cerminnya**, supaya
   formulir bisa terisi tanpa menunggu jaringan.
2. Cermin dipulihkan otomatis kalau kuki sah tapi localStorage kosong, dan
   **dihapus** kalau kuki sudah tidak sah — jadi tidak ada antarmuka yang
   menyangka dirinya masih masuk lalu ditolak 401.
3. `siap` membedakan "belum tahu" dari "sudah tahu, memang belum masuk". Tanpa
   itu setiap gerbang berkedip jadi layar login sepersekian detik pertama —
   bentuk lain dari disuruh masuk lagi.
4. Satu permintaan `/api/auth/me` per pemuatan halaman, dipakai bersama
   (`janjiSesi`). Sebelumnya Navbar memanggilnya **setiap pindah alamat**, dan
   `OwnerFastActions` sekali **per kartu iklan** — satu halaman daftar bisa
   menanyakan hal yang sama belasan kali, dan tiap panggilan ikut menanyai
   Supabase untuk profilnya.

**Gerbang login dirapikan jadi satu.** `/dashboard/login` dulu punya dua:
`layout.jsx` (mengalihkan yang sudah masuk, tapi selalu ke `/dashboard`,
membuang `?next=`) dan halaman kliennya sendiri (tidak tahu apa-apa soal kuki
httpOnly). Sekarang satu gerbang di `page.jsx` — server, sebelum satu piksel
dikirim, dan menghormati `?next=` lewat `tujuanAman()`.

**Aturan umum yang layak diingat:** jangan pernah menyimpulkan "belum masuk"
dari nilai localStorage yang kosong. Kosong berarti *tidak tahu*, dan yang tahu
cuma server.

## 5. Log & Riwayat Audit

### Canonical Bot Source of Truth

- **Repo bot**: `jualbeliusupolmed-creator/wa-bot-usu` (terpisah dari repo web ini)
- **Working copy lokal**: `bot-wa/` di root repo ini — **selalu sinkronkan sebelum edit**
- **Working copy VPS**: worktree di server produksi — **cek `git status` via SSH sebelum deploy**
- **Sebelum edit bot**: (1) SSH ke VPS, (2) catat commit HEAD aktif, (3) pastikan `bot-wa/` lokal sama commit-nya
- **Setelah edit lokal**: push ke `wa-bot-usu` dulu, baru pull di VPS. JANGAN langsung edit di VPS.
- **Status 28 Agustus 2026**: `bot-wa/` lokal branch `main` up-to-date dengan origin. Ada perubahan unstaged di `BottomNavbar.jsx` dan `Icons.jsx` (perlu di-review sebelum commit).

### Build Status

- **28 Agustus 2026**: `npm run build` **BERHASIL** — semua halaman dirender sebagai `ƒ (Dynamic)`, tidak ada static generation failure. Build issue yang dicatat sebelumnya sudah tidak ada.

*   **28 Agustus 2026 — Kode Iklan Pendek, URL `/c/{kode}`, dan Spesifikasi Terstruktur Listing**
    - Menambahkan helper `listingCode` dan migration `20260827205354_listing_code_and_specs.sql` untuk memperkuat field `listing_code` yang sudah ada di produksi (integer berbasis sequence, kini dikunci `NOT NULL` + `UNIQUE`) serta menambah `specs` (`jsonb`) untuk spesifikasi terstruktur per kategori.
    - Form jual (`src/app/jual/JualClient.jsx`) kini menampilkan blok spesifikasi dinamis per kategori (`Elektronik`, `Fashion`, `Buku`, `Buku Kuliah`, `Makanan`, `Kos`, `Jasa`) dan tombol template deskripsi agar input penjual lebih seragam.
    - API `POST /api/listings` kini mengikuti `listing_code` bawaan database dan menyanitasi `specs` di server; `PATCH /api/listings/[id]` ikut menjaga sanitasi saat edit; `GET /api/listings/browse` dapat menemukan listing langsung dari kode iklan yang diketik pengguna.
    - Browser publik (`src/app/HomeBrowser.jsx`) kini mendukung filter multi-chip berbasis `specs` dengan URL shareable (`?spec=key:value`) dan perilaku `AND`, misalnya kombinasi `Kos + AC + WiFi + Putri`. Filter dikerjakan deterministik di server route setelah query utama supaya tidak bergantung pada operator `jsonb` PostgREST yang rawan drift.
    - Halaman produk (`/produk/[slug]`) kini menampilkan kode iklan, tabel spesifikasi, dan panel edukasi "Transaksi Aman di Kampus". Kartu produk, share WhatsApp, dan QR poster ikut membawa konteks kode iklan; route baru `/c/[code]` me-redirect ke slug kanonis produk.
    - Verifikasi produksi setelah migration: `listing_code` bertipe `integer` dengan default sequence, `NOT NULL`, dan index unik; `specs` bertipe `jsonb` dengan default `{}` dan index GIN. Verifikasi lokal: `npm run lint` lulus tanpa error dan `npm test` lulus 61/61.
    - `npm run build` lokal di Windows masih gagal pada tahap prerender/export banyak halaman dengan pola `Cannot find module .next/server/app/.../page.js` setelah kompilasi sukses. Gejalanya lintas-rute dan tidak spesifik ke fitur listing/specs; indikasinya problem konfigurasi build/lingkungan lokal yang sudah lebih luas dari perubahan ini.

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

*   **26 Agustus 2026** - *Standalone Mading Post Permalink (`/mading/[id]`) & Feed Pagination*
    - **Halaman Standalone Menfess & Mading (`src/app/mading/[id]/page.jsx`, `MadingDetailClient.jsx`):**
      - Menghadirkan halaman detail mandiri untuk tiap postingan Menfess dan Info Kampus (`/mading/[id]`) lengkap dengan dynamic metadata OpenGraph (`title`, `description`, `images` ke endpoint generator IG image) dan Schema.org `SocialMediaPosting` JSON-LD.
      - Memungkinkan link preview kaya saat dibagikan ke WhatsApp, Telegram, Twitter/X, dan Facebook.
      - Fitur interaktif penuh: Like, Laporkan, Unduh Gambar Potrait HD (1080×1350 & 9:16), Balas Komentar bersarang, dan indikator badge OP.
    - **Penyempurnaan Feed Mading (`src/app/mading/MadingClient.jsx` & `src/app/api/mading/route.js`):**
      - Whitelist tipe postingan `organisasi`, `info`, dan `menfess` di backend dan URL parser (`?tab=organisasi`).
      - Menambahkan sistem pagination dengan tombol "Muat lebih banyak" (Load More) sehingga ribuan postingan lampau tetap dapat diakses pengguna tanpa batas.
      - Memperbarui tombol Bagikan agar menghasilkan link permalink presisi (`/mading/[id]`).

*   **26 Agustus 2026** - *Manual WhatsApp Escape Hatch di Antrean Notifikasi (Anti-Banned Fail-Safe)*
    - **Komponen (`src/components/baileys/TabAntrean.jsx`, `src/components/baileys/AntreanBot.jsx`, `src/app/api/admin/outbox/route.js`):**
      - Menghadirkan tombol **`💬 Chat WA Manual`** (`wa.me/62xxx?text=...`) di setiap baris antrean tertunda. Jika bot utama & bot cadangan sedang diblokir/down, admin dapat langsung membuka chat ke nomor tujuan lewat browser/HP dari nomor WhatsApp pribadi mana pun dengan teks notifikasi yang sudah otomatis terisi.
      - Menambahkan tombol **`✓ Tandai Terkirim`** (`POST /api/admin/outbox` dengan `{ manual: id }`) agar pesan yang sudah dikirimkan manual langsung beralih status menjadi `terkirim` dengan catatan audit `"Dikirim manual oleh admin via WA Web/App"`.

*   **26 Agustus 2026** - *Format Unduh Menfess: Dual Potrait HD (1080×1350 & 9:16 Story)*
    - **Generator Gambar Visual Menfess (`src/lib/madingInstagramImage.js`, `src/components/mading/UnduhMenfessModal.jsx`, `/api/mading/[id]/instagram-image`):**
      - Mengonfigurasi 2 opsi unduh gambar Menfess ke dalam format **Potrait HD**:
        1. **📱 Potrait 1080 × 1350 (Rasio 4:5):** Disesuaikan khusus untuk postingan Feed Instagram & Carousel tanpa cropping.
        2. **📲 Potrait 1080 × 1920 (Rasio 9:16):** Disesuaikan khusus untuk Instagram Story, WhatsApp Status, TikTok, dan Reels dengan tipografi bertingkat, area aman (*safe margin*) status bar, dan badge komunitas.
      - Menghasilkan file JPEG tajam berkualitas tinggi via Sharp dan layout Pango text layer yang aman dari teks overflow.

*   **26 Agustus 2026** - *Penyempurnaan Tampilan Menfess & Mading (Minimalis, Rapi & Elegan)*
    - **Penyempurnaan Desain Antarmuka (`src/app/mading/MadingClient.jsx`):**
      - **Header & Filter Terpadu:** Merapikan tab bar kategori (`✨ Semua`, `💌 Menfess`, `📢 Info Kampus`, `🏛️ Organisasi`, `✍️ Blog`) dengan jarak teratur dan indikator aktif model *pill button* Apple-style. Menggabungkan pemilihan kampus (`USU`, `POLMED`, `Bebas`) dan filter cepat (`🔥 Populer`, `📷 Foto`) ke satu baris rapi yang anti-tumpuk di layar HP.
      - **Kartu Menfess Terisolasi (Clean Minimalist Cards):** Mengubah tampilan list flat menjadi kartu-kartu rounded 3xl (`rounded-3xl bg-white dark:bg-[#151518]`) dengan border lembut, bayangan halus, dan kontras teks yang tajam dan nyaman dibaca.
      - **Toolbar Aksi 1-Baris:** Memperbaiki teks balasan/like yang sebelumnya terpotong atau wrap vertikal di mobile (`❤️ Like`, `💬 Komentar`, `📥 Unduh`, `🔗 Bagikan`, `🚩 Laporkan`, `👁️ Views`).
      - **Thread Komentar Terintegrasi:** Menghapus tombol balas ganda yang redundan; klik pada ikon komentar kini langsung membuka accordion tanggapan thread komentar dengan indikator badge OP dan kotak input minimalis.
      - **Fitur 100% Utuh:** Tidak ada fitur yang dikurangi — Like, balasan, unduh gambar potrait/landscape, share WhatsApp, report, zoom gambar, filter kampus, dan posting menfess tetap aktif sempurna.

*   **26 Agustus 2026** - *Full SSR Pre-rendering, JSON-LD Schema & Crawler / SEO Optimization across All Discovery Pages*
    - **Arsitektur Server-Side Rendering (SSR + Hybrid Client Hydration):**
      - Merombak halaman eksplorasi publik yang sebelumnya pure client component (`"use client"` dengan `useEffect` fetch) menjadi **Async Server Components** dengan pre-fetching data langsung di server:
        1. **`/mading` (`src/app/mading/page.jsx` & `MadingClient.jsx`):** Server merender 20 postingan menfess & blog awal langsung ke dalam HTML mentah, menyertakan Schema.org `ItemList`, dan passing `initialPosts` ke antarmuka interaktif.
        2. **`/organisasi` (`src/app/organisasi/page.jsx` & `OrganisasiClient.jsx`):** Server mengambil direktori UKM, BEM, HIMA terverifikasi dan menyuntikkan Schema `ItemList` organisasi kampus.
        3. **`/oprec` (`src/app/oprec/page.jsx` & `OprecClient.jsx`):** Server mengambil daftar open recruitment aktif dan menyuntikkan metadata serta schema event/kepanitiaan.
        4. **`/dicari` (`src/app/dicari/page.jsx` & `DicariClient.jsx`):** Server mengambil daftar kebutuhan barang/jasa mahasiswa langsung dari tabel `wanted_listings`.
      - **Dampak:** Web crawler (Googlebot, Bingbot, Meta crawler, Twitterbot, preview WhatsApp, dan AI scraper) dapat langsung membaca 100% konten live di request pertama tanpa mengalami *cache-miss* atau skeleton kosong, sekaligus meningkatkan First Contentful Paint (FCP) bagi pengunjung pengguna.

*   **26 Agustus 2026** - *Transformasi Total Dashboard Khusus Organisasi & UKM (Adaptive Institutional Portal)*
    - **Komponen (`src/components/dashboard/UkmDashboardView.jsx`, `src/app/dashboard/page.jsx`):**
      - Merombak pengalaman dashboard untuk akun bertipe Organisasi/UKM agar terpisah total dari persona penjual barang bekas biasa.
      - **Header Organisasi:** Menghilangkan toggle "Iklan & Jualan / Toko Saya" dan menggantinya dengan **Header Portal Resmi UKM** ber-badge `✓ Akun Resmi Terverifikasi`, kategori organisasi, dan aksi cepat (`+ Buka Oprec Baru`, `📢 Mading Resmi`, `🛍️ Tambah Danus`).
      - **Pusat Rekrutmen & Oprec ATS:** Manajemen formulir oprec, countdown sisa hari, live applicants counter, screening pelamar, dan ekspor data pendaftar ke file CSV/Excel instan.
      - **Pusat Publikasi & Mading Resmi:** Formulir terbit pengumuman resmi organisasi berstempel `🏛️ Pengumuman Resmi` ke feed Mading Kampus dengan tracking views/shares/komentar.
      - **Danus & Merchandise Resmi:** Mengubah konteks jualan barang biasa menjadi etalase Dana Usaha (Korsa, Jaket Himpunan, Kaos Event, Tiket Acara).
      - **Struktur Pengurus & BPH:** Manajemen susunan kepengurusan (Ketua, Sekretaris, Bendahara, Koordinator Divisi) dan editor Visi & Misi yang langsung tersinkronisasi ke profil publik.
      - **Endpoint Backend (`PATCH /api/organisasi`):** Menyimpan pembaruan struktur pengurus, bio, dan medsos organisasi.

*   **26 Agustus 2026** - *Autentikasi Penuh Email & Password Tanpa OTP (Organisasi & Pengguna Umum)*
    - **Email & Password Login & Register (`/api/auth/email/login`, `/api/auth/email/daftar`, `src/components/OTPModal.jsx`):**
      - Pengguna dan pengurus organisasi kini dapat mendaftar dan masuk secara instan menggunakan **Email & Password** tanpa memerlukan kode OTP WhatsApp sama sekali.
      - Password di-hash aman dengan `bcryptjs` (salt rounds 10) dan dicocokkan langsung ke kolom `seller_profiles.pin`.
      - Modal `OTPModal.jsx` memiliki sub-toggle *Masuk* dan *Daftar Baru (Tanpa OTP)* di tab *Email & Password*.
      - Formulir pendaftaran akun UKM `/organisasi/daftar` menyertakan kolom Email Organisasi dan Password Akun agar pengurus dapat mengelola akun tanpa bergantung pada nomor WhatsApp.

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

*   **28 Agustus 2026** - *Audit situs produksi: soft-404, menu mati, dan akar repo* — semua temuan dibuktikan dengan mengetuk `https://www.jualbeliusupolmed.web.id`, bukan dengan membaca kode saja.
    - **Soft 404 di SELURUH halaman dinamis (yang paling serius).** `/produk/<tidak-ada>`, `/blog/…`, `/toko/…`, `/penjual/…`, `/mading/…`, dan `/c/…` menjawab **HTTP 200** sambil menampilkan layar 404. Halaman-halaman itu sudah benar memanggil `notFound()`; yang menggagalkannya `src/app/loading.jsx` di **akar** `app/`. Satu `loading.jsx` di akar memasang batas Suspense di atas seluruh pohon, jadi Next mengalirkan kerangka halaman berikut status 200 sebelum komponen halaman sempat memanggil `notFound()` — status tidak bisa ditarik kembali setelah header terkirim. Mesin pencari membaca status, bukan tulisan di layar; efeknya URL sampah terindeks sebagai halaman sah.
      **Perbaikan:** markup pemuat dipindah ke `src/components/PageLoader.jsx`, `src/app/loading.jsx` dihapus, dan `loading.jsx` dipasang ulang **per segmen** — hanya di 13 segmen yang tidak punya keturunan pemanggil `notFound()` (`jual-beli`, `dicari`, `jasa`, `sosial`, `oprec`, `organisasi`, `cari-teman`, `teman`, `swap`, `chat`, `favorit`, `progres`, `dashboard`). **Aturan yang harus diingat: jangan pernah menaruh `loading.jsx` di segmen yang bisa 404** — `/blog` dan `/mading` sengaja dilewati karena punya anak `[slug]`/`[id]`.
    - **`/admin/kontak_pembeli` selalu 404.** Menunya dipajang di `nav.js`, panelnya ada (`BuyerContactsPanel`), API-nya ada (`/api/admin/buyer-contacts`), `AdminPanel` sudah siap merendernya — yang hilang cuma satu baris di `ADMIN_TABS`, dan `/admin/[tab]` memanggil `notFound()` untuk apa pun yang tak terdaftar. Kebalikan persis dari kasus `blacklist` yang sudah dicatat di berkas yang sama.
    - **Empat menu mati di panel demo publik.** `AdminNav` merakit tautan dari `GROUPS` tanpa menyaring basis, sementara `/admin-demo/[tab]` cuma menerima tab di `ADMIN_TABS` — jadi `teman`, `obrolan`, `mading`, dan `kontak_pembeli` mengantar pengunjung `/admin-demo` ke halaman kosong. Sekarang: `kontak_pembeli` **dibuatkan kembarannya** (`/api/admin-demo/buyer-contacts`, data karangan, `BuyerContactsPanel` memakai `useBasisApi()` seperti Keuangan/Tren/Audit), sedangkan tiga sisanya ditandai `demoOff: true` di `nav.js` dan disaring oleh `grupUntuk()`/`navUntuk()` di sidebar maupun pencarian Ctrl+K. Menambah halaman demo untuk salah satunya = hapus tanda itu.
    - **Judul ganda.** `/admin-demo` dan `/jasa/tawarkan` menuliskan sufiks "— Jual Beli USU Polmed" di `title` tingkat-atas, padahal template di layout akar menambahkannya lagi. `openGraph.title` tidak lewat template — di sana sufiksnya justru harus utuh.
    - **Akar repo dibersihkan.** Repo ini publik; 4,6 MB tangkapan layar acak (`ggg.png`, `sssss.png`, `dd5010eb-….png`, `Weswey aseli….jpg`, `y  analisa/`) dan transkrip percakapan AI (`isi.md` 320 KB, `terakhir.md`, `lint-results.txt`) dicabut, dan `.gitignore` diberi jaring agar tidak kembali. Sudah dipindai lebih dulu: **tidak ada kredensial**, nomor WA di dalamnya hanya placeholder. `meta.md` ternyata dokumen sungguhan (SOP Meta Graph API) — dipindah ke `docs/meta-graph-api-sop.md`, bukan dibuang.
    - **`/penjual/<apa pun>` menjawab 200 dengan profil kosong.** Bukan soal streaming, melainkan salah baca nilai balik supabase-js: penjaganya berbunyi `if (!listings && …)`, padahal supabase-js mengembalikan **array kosong**, bukan `null`, saat tak ada baris — jadi `!listings` selalu false dan penjaganya tidak pernah berjalan. Dibuktikan di produksi: `/penjual/000` tayang sebagai "000 — Profil Penjual, 0 iklan". Sekarang syaratnya memeriksa kekosongan; `!allListings` dipertahankan supaya query yang gagal (null) tidak ikut dibaca sebagai "penjualnya tidak ada". **Aturan umum: jangan pernah memakai `!data` untuk menguji "tidak ada baris" pada query yang mengembalikan daftar** — pakai `.length === 0`, atau `.maybeSingle()` yang memang mengembalikan null.
    - **Efek samping yang menyenangkan:** `redirect()` juga ikut jujur. `/blog` dan `/admin-demo` dulu menjawab 200 padahal keduanya mengalihkan; sekarang 307 ke `/mading?tab=blog` dan `/admin-demo/overview`. Penyebabnya sama persis dengan soft-404 — status sudah terkirim sebelum `redirect()` sempat berjalan.
    - **Tiga fungsi RPC terbuka untuk `anon` (diterapkan ke produksi setelah disetujui pemilik).** `process_teman_swipe`, `increment_comments_count`, dan `increment_listing_views` bisa dipanggil siapa saja lewat `/rest/v1/rpc/<nama>` hanya bermodal kunci anon — yang memang publik. Yang terberat yang pertama: ia menerima `p_swiper_id` DAN `p_target_id` sebagai argumen, jadi pemanggil menentukan sendiri siapa menggeser siapa, dan bisa memaksa match antara dua orang yang tidak pernah saling memilih. Aman dicabut karena ketiganya cuma dipanggil dari route server ber-`service_role`.
      **Jebakan yang memakan satu percobaan:** `REVOKE … FROM anon, authenticated` **tidak berpengaruh**. Postgres memberi EXECUTE ke pseudo-role `PUBLIC` secara bawaan pada setiap fungsi baru, dan `anon` mewarisi lewat jalur itu, jadi `has_function_privilege` tetap `true`. Yang benar `REVOKE … FROM PUBLIC`, lalu `GRANT … TO service_role`. Fungsi mading yang sudah aman sejak awal memang dicabut dari PUBLIC. Migrasinya: `supabase/migration_cabut_rpc_anon.sql`.
    - **Belum diterapkan, menunggu keputusan:** `supabase/migration_rapikan_indeks_dan_policy.sql` — indeks kembar `idx_listings_listing_code_unique` (salinan dari indeks yang menopang UNIQUE constraint; setiap tulis ke `listings` memelihara dua B-tree identik) dan policy `service_role_full_access_buyer_contacts` yang memanggil `auth.role()` sekali per baris alih-alih sekali per query. 23 lint "Unused Index" sengaja dibiarkan: hampir semuanya milik tabel fitur berumur seminggu, dan "belum pernah terpakai" di situ bukan bukti indeksnya salah.
    - **Yang diperiksa dan ternyata sehat:** 21 endpoint `/api/admin/*` dan `/api/cron/*` semuanya menjawab **401** tanpa kredensial; header keamanan lengkap (HSTS, CSP `frame-ancestors`, `nosniff`, Referrer-Policy, Permissions-Policy); `robots.txt` dan `sitemap.xml` (99 URL) waras; 0 tautan internal putus dari 66 halaman; 0 `fetch('/api/…')` menunjuk route tak ada dari 112 route; 0 impor gagal.

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

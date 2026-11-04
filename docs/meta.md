# Integrasi Meta — Dokumentasi, Riwayat, dan Kesiapan

**Status catatan:** 4 November 2026
**Ruang lingkup:** Instagram Graph API/Business Login, publikasi Instagram,
Instagram DM/webhook, dan batas integrasi Facebook/WhatsApp.

Dokumen ini adalah memory operasional khusus integrasi Meta. Ia merekam apa
yang tersedia di kode, apa yang pernah dicatat berhasil, dan apa yang belum
diverifikasi pada layanan live. **Keberadaan kode atau kelulusan test tidak
membuktikan bahwa aplikasi Meta, Vercel, Supabase, atau akun Instagram produksi
sudah siap.**

## Ringkasan kesiapan

| Area | Kondisi yang diketahui | Status |
| --- | --- | --- |
| Instagram Business Login OAuth | Start/callback, state bertanda tangan, pemeriksaan sesi dan scope, pertukaran token long-lived, dan penyimpanan terenkripsi tersedia di kode. | Ada di kode; OAuth akun produksi terbaru belum dibuktikan. |
| Token Instagram per akun | Token disimpan terenkripsi AES-256-GCM di `system_settings`, dikaitkan dengan ID akun, dan memiliki metadata host/kedaluwarsa. | Ada di kode; kunci harus tersedia di secret manager runtime. |
| Publikasi Instagram | Graph API media container, pemeriksaan kesiapan media, publikasi, dan alur antrean tersedia. Akun Mading dipilih eksplisit. | Ada di kode; publikasi nyata terbaru belum dibuktikan. |
| Instagram DM dan webhook | Handshake GET, validasi HMAC-SHA256 POST, routing event, deduplikasi durable, dan subscription akun setelah OAuth tersedia. | Ada di kode; perlu verifikasi pengaturan Meta serta uji signed event live. |
| DM Menfess dan analitik | Pengaturan Menfess, pemrosesan teks, serta endpoint analitik agregat dengan pembatasan scope tersedia. | Ada di kode; alur produksi dan izin Meta belum dibuktikan. |
| Facebook Graph API | Tidak ada bukti bahwa publikasi Facebook aktif; perubahan terdahulu menyelaraskan UI agar tidak menjanjikan publikasi Facebook. | Jangan dianggap didukung. |
| WhatsApp Business Platform/Cloud API | Bot WhatsApp berada pada sistem terpisah; tidak ada bukti koneksi WhatsApp Cloud API dalam integrasi Meta ini. | Di luar integrasi ini. |
| Supabase produksi | Knowledge proyek mencatat RPC `hit_rate_limit` telah dikeraskan dan diterapkan pada 2 Nov 2026; status live saat ini belum dicek ulang. | Perlu konfirmasi sebelum go-live. |

### Pemeriksaan lokal terakhir

Pada sesi penyempurnaan sebelum catatan ini, seluruh **334 test di 70 file**
lulus, `npm run lint` lulus, `npm run build` berhasil, dan `git diff --check`
bersih. Hasil itu memvalidasi working tree lokal saat itu, bukan konfigurasi
atau perilaku produksi. Pemeriksaan selanjutnya harus dijalankan kembali setelah
perubahan kode yang relevan.

### Kesimpulan

Integrasi Instagram **siap pada sisi implementasi lokal**, tetapi **belum boleh
dinyatakan siap produksi sepenuhnya**. Status akhir tetap bergantung pada
konfigurasi rahasia, status/izin aplikasi Meta, langganan webhook, migrasi
Supabase, dan uji end-to-end menggunakan akun yang memang diotorisasi.

## Peta implementasi

### Instagram Business Login (OAuth)

- Admin membuat akun Instagram dan menetapkan scope kampus/provinsi di
  **Admin → Sosial**, lalu memulai **Hubungkan / Perbarui OAuth**.
- Callback OAuth terdaftar harus persis:
  `https://<site-origin>/api/admin/social/instagram/oauth/callback`.
- Alur server memvalidasi state HMAC dan cookie state berumur 10 menit, sesi
  admin, izin pengelolaan, dan scope akun sebelum menukar authorization code.
- OAuth meminta izin minimum yang digunakan implementasi:
  `instagram_business_basic`, `instagram_business_content_publish`, dan
  `instagram_business_manage_messages`. Tidak ada integrasi Threads.
- Token long-lived disimpan di server, bukan dikirim kembali ke browser.
  Akun Instagram Login memakai `graph.instagram.com`.
- OAuth yang berhasil tidak otomatis membuktikan hak akses produksi, publikasi,
  DM, atau webhook. Kegagalan subscribe webhook dicatat terpisah dan tidak
  membatalkan kredensial publikasi.

### Kredensial, enkripsi, dan kompatibilitas

- Token per akun dienkripsi AES-256-GCM dengan
  `META_ACCOUNT_TOKEN_ENCRYPTION_KEY`, yaitu Base64 dari 32 byte acak.
- Payload token terikat pada ID baris akun dan Instagram Account ID; host API
  dibatasi ke host Graph API yang diizinkan. Refresh dicoba saat token
  Instagram Login mendekati kedaluwarsa.
- Kredensial Instagram Business Login menggunakan `graph.instagram.com`.
  Kredensial Facebook Login lama tetap dapat memakai `graph.facebook.com`.
  Kedua jenis token/host tersebut tidak boleh dicampur.
- Fallback konfigurasi katalog global lama dipertahankan untuk kompatibilitas.
  Akun baru harus menggunakan kredensial per akun dan tidak boleh mengandalkan
  fallback tersebut.
- Jangan menaruh token, App Secret, encryption key, Verify Token, atau data
  pelanggan di source, dokumentasi, URL, screenshot, issue, maupun log.

### Publikasi konten

- Publikasi memakai Graph API versi default `v26.0`; override server-side
  `META_GRAPH_API_VERSION` tersedia. Periksa dukungan versi Meta sebelum
  mengganti atau memperbarui nilai.
- Alur publikasi membuat media container, menunggu status siap, lalu
  menerbitkan media. URL gambar harus HTTPS dan dapat diakses Meta.
- Pemilihan akun Instagram Mading dilakukan superadmin secara eksplisit; sistem
  tidak memilih akun pertama secara otomatis.
- Status antrean, hasil Meta, serta kegagalan pencatatan harus diperlakukan
  berbeda. Jika hasil publikasi ambigu, periksa profil akun sebelum mengulang
  agar tidak membuat post duplikat.
- Publikasi Facebook tidak termasuk kemampuan yang telah dibuktikan. Jangan
  mengaktifkan atau menjanjikannya berdasarkan istilah “Meta” saja.

### Instagram DM dan webhook

- Callback webhook terpisah dari callback OAuth:
  `https://<site-origin>/api/webhook/instagram`.
- GET handshake hanya berhasil dengan `META_WEBHOOK_VERIFY_TOKEN` yang benar.
- POST memerlukan `X-Hub-Signature-256` yang valid menggunakan HMAC-SHA256 dan
  `META_INSTAGRAM_APP_SECRET`; `META_APP_SECRET` tetap diterima sebagai alias
  kompatibilitas. Tanpa secret/signature yang valid, request ditolak.
- Setelah OAuth, server mencoba subscribe akun ke field
  `messages` dan `messaging_postbacks`. App Dashboard tetap harus mengaktifkan
  produk/callback/field yang relevan dan akun harus punya izin yang sesuai.
- Production dedupe memakai RPC PostgreSQL `hit_rate_limit` untuk klaim event
  durable. Bila layanan durable gagal, webhook gagal tertutup, bukan
  mengandalkan cache proses serverless.
- Balasan DM tetap tunduk pada kebijakan dan jendela pesan Meta. Jangan gunakan
  alur ini untuk DM promosi massal.
- Menfess DM dinonaktifkan secara default dan hanya mendukung alur yang tersedia
  di kode; lampiran DM Menfess belum didukung. Analitik Menfess hanya
  mengembalikan agregat, bukan teks pesan atau ID pengirim ke browser.

## Konfigurasi runtime

Set nilai berikut langsung pada secret manager/environment Vercel yang
bersesuaian. Daftar ini menyebut **nama** variabel saja dan bukan nilainya.

| Variabel | Fungsi |
| --- | --- |
| `META_INSTAGRAM_APP_ID` | App ID Instagram Business Login. |
| `META_INSTAGRAM_APP_SECRET` | App Secret server-side; juga dapat dipakai untuk HMAC webhook. |
| `META_INSTAGRAM_REDIRECT_URI` | Callback OAuth persis seperti yang terdaftar di Meta. |
| `META_ACCOUNT_TOKEN_ENCRYPTION_KEY` | Kunci AES-256-GCM Base64 32 byte untuk token per akun. |
| `META_WEBHOOK_VERIFY_TOKEN` | Verify Token untuk GET handshake; bukan App Secret. |
| `META_APP_SECRET` | Alias kompatibilitas lama bagi validasi signature webhook. |
| `META_GRAPH_API_VERSION` | Override opsional; default kode `v26.0`. |
| `META_KATALOG_IG_USER_ID`, `META_KATALOG_IG_ACCESS_TOKEN` | Kredensial kompatibilitas katalog lama. |
| `META_MENFESS_IG_USER_ID`, `META_MENFESS_IG_ACCESS_TOKEN` | Kredensial kompatibilitas Menfess lama. |

Semua secret harus server-only: tidak memakai prefix `NEXT_PUBLIC_`. App ID
bukan rahasia, tetapi konfigurasi Meta tetap harus dicatat melalui dashboard
resmi, bukan disalin ke dokumen ini.

## Ketergantungan Supabase

- Webhook menggunakan tabel `rate_limit_hits` dan RPC `hit_rate_limit` untuk
  klaim deduplikasi event yang durable serta pembersihan klaim kedaluwarsa.
- Migrasi terkait:
  - `supabase/migrations/202610260002_rate_limit_hits.sql`
  - `supabase/migrations/20261102163100_harden_rate_limit_rpc.sql`
- Knowledge proyek mencatat migrasi hardening RPC diterapkan setelah
  persetujuan pada 2 November 2026 dan RPC diverifikasi sebagai
  `SECURITY INVOKER`, `search_path` kosong, dengan hak execute dibatasi ke
  `service_role`. **Catatan tersebut historis; status database target saat ini
  harus diverifikasi ulang melalui workflow Supabase yang disetujui sebelum
  produksi.** Jangan menjalankan migrasi dari catatan ini secara langsung.
- Token akun disimpan terenkripsi di `system_settings`. Pastikan policy/akses
  tabel tidak mengekspos token atau value sensitif melalui Data API, dan jangan
  pernah menggunakan service role pada klien browser.
- Supabase mengumumkan penghentian empat cipher TLS 1.2 CBC pada HTTP API
  paling cepat 10 November 2026. Runtime modern seharusnya memakai suite yang
  didukung, tetapi operator perlu memantau koneksi Supabase menjelang tanggal
  tersebut; direct Postgres/pooler tidak termasuk perubahan itu.

## Riwayat keputusan dan perubahan

| Tanggal | Catatan |
| --- | --- |
| 2 Nov 2026 | Project Knowledge mencatat aplikasi Meta Developer tipe Bisnis, endpoint webhook Instagram, handshake webhook yang berhasil, field `messages`, dan subscription satu akun. Detail kredensial tidak disimpan dalam dokumen. Catatan ini tidak membuktikan bahwa konfigurasi yang sama masih aktif sekarang. |
| 2 Nov 2026 | RPC `hit_rate_limit` dikeraskan untuk caller server terpercaya; catatan proyek menyebut migrasi diterapkan setelah persetujuan dan verifikasi hak akses/RPC dilakukan. |
| 3 Nov 2026 | Business Login per akun, enkripsi token, pemilihan akun Mading eksplisit, DM Menfess nonaktif secara default, dan batasan izin didokumentasikan. Belum ada OAuth atau DM diuji ke akun produksi saat catatan itu dibuat. |
| 3 Nov 2026 | Callback OAuth mulai mencoba subscription `messages` dan `messaging_postbacks`; signature webhook dan klaim idempotensi produksi dibuat fail-closed; endpoint diagnostik lama yang tidak aman dihapus; default Graph API diperbarui ke `v26.0`. |
| 4 Nov 2026 | Verifikasi working tree lokal terakhir: 334 test lulus, lint lulus, production build berhasil, dan `git diff --check` bersih. Tidak ada uji live Meta/Vercel/Supabase yang dilakukan dalam verifikasi tersebut. |

Jika temuan baru bertentangan dengan catatan historis, gunakan urutan sumber
berikut: **konfigurasi dashboard/environment yang dibaca aman → status deploy
dan migrasi yang diverifikasi → implementasi repo saat ini → catatan sejarah**.
Jangan menyalin nilainya ke chat atau dokumen.

## Sinkronisasi Markdown dan HTML

`docs/meta.md` adalah satu-satunya sumber isi. `docs/meta.html` dihasilkan
otomatis oleh `scripts/sync-meta-docs.mjs`; jangan mengedit HTML langsung.

- `npm run dev` dan `npm run dev:turbo` membuat HTML lalu memantaunya selama
  server development berjalan. Perubahan Markdown akan tercermin dalam HTML
  setelah file disimpan.
- `npm run build` membuat ulang HTML sebelum build produksi.
- `npm run sync:meta-docs` membuat ulang HTML secara manual;
  `npm run check:meta-docs` memeriksa bahwa hasil commit sudah sama; dan
  `npm run watch:meta-docs` memantau Markdown tanpa menjalankan Next.js.
- File HTML menyimpan SHA-256 sumber. Tes `__tests__/metaDocsSync.test.js`
  mencegah isi hasil generator dan Markdown menyimpang.

## Checklist sebelum menyatakan siap produksi

### Meta Developer dan akun

- [ ] Pastikan App ID, App Secret, redirect URI, dan akun berasal dari aplikasi
  Meta/environment yang sama.
- [ ] Periksa status aplikasi (Live), App Review, Advanced Access, Business
  Verification, serta izin Business Login yang benar-benar diperlukan.
- [ ] Pastikan akun uji adalah Instagram Professional yang diotorisasi dan
  scope organisasi di panel sesuai.
- [ ] Isi environment server melalui secret manager; periksa encryption key,
  App Secret, Verify Token, dan versi Graph API tanpa menampilkan nilainya.

### Webhook, publikasi, dan DM

- [ ] Daftarkan callback OAuth dan webhook sebagai dua URL yang berbeda.
- [ ] Aktifkan field webhook yang diperlukan di App Dashboard dan pastikan
  subscription akun berhasil setelah OAuth.
- [ ] Uji GET handshake; POST tanpa signature/tanda tangan tidak valid harus
  ditolak, lalu uji event bertanda tangan dari akun uji yang diotorisasi.
- [ ] Konfirmasi migrasi Supabase/RPC dan hak akses durable event claim pada
  project yang benar sebelum menerima DM produksi.
- [ ] Uji `test_connection`, publikasi gambar dan carousel, serta pencatatan
  hasil; pastikan retry tidak menerbitkan duplikat.
- [ ] Uji DM inbound dan respons dalam batas kebijakan/jendela Meta; periksa
  log hanya menggunakan status dan ID yang disamarkan, bukan isi pesan/token.
- [ ] Jika memakai Menfess, uji opt-in/pengaturan, moderasi, batas kuota, serta
  agregasi analitik tanpa mengekspos identitas atau teks.

### Operasi dan pemulihan

- [ ] Catat versi deployment dan environment yang diuji; bedakan uji Preview
  dari Production.
- [ ] Tetapkan pemilik rotasi/revokasi token dan encryption key. Kehilangan
  encryption key dapat membuat token tersimpan tidak dapat dipulihkan.
- [ ] Sediakan prosedur menonaktifkan fitur DM/publikasi dan memulihkan versi
  deployment sebelumnya.
- [ ] Jangan kirim pesan nyata atau menerbitkan konten tanpa persetujuan pemilik
  akun uji.

## Referensi repo

- [Panduan setup Meta Instagram](./setup-meta-instagram.md)
- [SOP Meta Graph API](./meta-graph-api-sop.md)
- [Memory proyek](../PROJECT_KNOWLEDGE.md)
- [OAuth Business Login](../src/lib/instagramBusinessOAuth.js)
- [Kredensial akun Instagram](../src/lib/instagramAccountCredentials.js)
- [Webhook Instagram](../src/app/api/webhook/instagram/route.js)
- [Subscription webhook](../src/lib/instagramWebhooks.js)
- [Publikasi Graph API](../src/lib/meta.js)
- [Migrasi rate-limit](../supabase/migrations/202610260002_rate_limit_hits.sql)
- [Migrasi hardening RPC](../supabase/migrations/20261102163100_harden_rate_limit_rpc.sql)

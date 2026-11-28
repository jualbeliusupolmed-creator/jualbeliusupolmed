# Audit Redesign Kampus Kita — 27 Nov 2026

## Ringkasan status

- **Audit source awal:** selesai untuk struktur, routing, shell publik, modul utama, autentikasi/otorisasi, dan representasi data utama.
- **Implementasi redesign:** sebagian; fondasi navigasi, portal Berita, dan hub Jelajahi sudah dibuat. Modul lain belum diredesign.
- **Scope yang diverifikasi:** kode dan browser lokal. Preview Berita menjalankan query baca melalui konfigurasi server yang tersedia; tidak ada operasi tulis, migrasi, pengiriman pesan, atau deployment.
- **Repository:** Next.js App Router; versi manifest: Next 15.5.29, React 19.3.1, Tailwind 3.4.13; konfigurasi OpenNext/Cloudflare ada. Jangan memakai catatan lama yang menyebut Next 14/Vercel sebagai kondisi kini tanpa verifikasi.
- **Referensi Stitch:** 28 file `code.html`, 31 screenshot, dan 2 dokumen `DESIGN.md` sudah diekstrak di session storage; tidak ada file referensi yang disalin ke source aplikasi.
- **Rencana branch:** `redesign/kampus-kita-v2`. Branch dibuat dari HEAD yang sedang aktif; worktree saat awal sudah memuat perubahan pengguna pada web, bot, Cloudflare, dan LINUSKU. Semua perubahan tersebut dipertahankan dan tidak di-stage.

## Status halaman prioritas (28 Nov 2026)

| Halaman | Desktop | Mobile | Backend | Status |
|---|---|---|---|---|
| Jual Beli | Rail filter, katalog, dan informasi terpisah; posisi kolom terukur. Screenshot desktop penuh belum tervalidasi karena viewport browser tidak sesuai ukuran yang diminta. | Search, filter disclosure, dua aksi sejajar, banner Open PO, kategori cepat, dan grid dua kolom. Tidak overflow pada viewport aktual 487px; 390px yang diminta tidak tercapai oleh emulator. | Query dan endpoint browse dipertahankan; filter kategori dinamis menggunakan nama kategori saat memuat halaman berikutnya. Belum ada uji API kategori dinamis end-to-end. | Sedang dikerjakan |
| Detail Produk | Perubahan struktur dan galeri sudah ada, visual review penuh belum dilakukan. | Target sentuh dan galeri sudah diperbaiki, breakpoint penuh belum diverifikasi. | Listing, sesi pemilik, dan alur chat lama dipertahankan; belum diuji dengan listing pemilik yang terotorisasi. | Sebagian selesai |
| Form Jual | State tarif, preview, dan ringkasan sudah diperbarui, screenshot halaman penuh belum diulang. | Form satu kolom dan target sentuh sudah disesuaikan, breakpoint tepat belum diverifikasi. | Payload, validasi, draft, dan keputusan pembayaran server dipertahankan. | Sebagian selesai |
| Form Edit | State baca/error dan ringkasan sudah diperbarui, visual review penuh belum dilakukan. | Layout responsif sudah disesuaikan, uji lebar 375px belum tercapai. | Endpoint dan payload dipertahankan; listing terotorisasi belum tersedia untuk smoke test. | Sebagian selesai |
| Open PO | Hero, pencarian, filter kampus, rail kategori, jumlah hasil, dan empty/error state telah disusun ulang. Review browser pada viewport CSS 1440px; kartu aktif belum bisa ditinjau karena katalog tidak mengembalikan batch aktif. | Search dan filter tersusun ulang, kategori menjadi chip horizontal, kartu dirancang horizontal, dock tidak menutupi CTA pada akhir halaman. Review browser pada 390×844; `scrollWidth` 385px, satu H1/satu landmark main, CTA tetap terlihat saat scroll ke bawah. Kartu aktif belum tersedia untuk review visual. | Query dan payload reservasi tidak diubah. Filter kategori dan state kosong diuji. Reservasi tidak dikirim karena tidak ada batch aktif dan sesi pengguna uji. | Sebagian selesai |
| Dashboard PO | Header, ringkasan, kartu batch, dan formulir pengelolaan disusun ulang. Screenshot desktop belum bisa diperiksa dengan sesi akun. | Form dan kartu tersusun ulang untuk satu kolom; screenshot breakpoint belum bisa diperiksa dengan sesi akun. | Route dan payload pengelolaan dipertahankan; empat tes komponen memakai fixture terisolasi. Hak akses dan alur akun belum diuji karena tidak ada sesi uji. | Sebagian selesai |
| Dashboard Pengguna | Header akun, kartu identitas, navigasi workspace, ringkasan, katalog barang aktif, Tawaran, dan Dicari disusun ulang. Bagian pembayaran tertunda, riwayat/nonaktif, Performa, PRO, Referral, Profil, Blog, dan UKM belum diperbarui menyeluruh. Screenshot halaman penuh tidak tersedia karena akun uji tidak ada. | Profil dan katalog memakai susunan bertingkat/grid dan ruang aman untuk dock; Tawaran/Dicari memiliki kartu satu kolom ke grid desktop. Lebar penuh belum diverifikasi melalui browser setelah autentikasi. Beberapa bagian masih memakai komposisi lama. | Data, tab, dan aksi/API existing dipertahankan; akses akun mengalihkan ke login tanpa sesi. Alur pemilik tidak diuji. | Sebagian selesai |
| Berita | Portal artikel sudah memiliki perubahan sebelumnya, detail dan visual penuh belum diperiksa. | Belum ada review breakpoint halaman penuh. | Query artikel terbit dipertahankan; workflow penulis belum diverifikasi. | Sebagian selesai |
| Ruang Penulis | Belum diperiksa ulang. | Belum diperiksa ulang. | Alur pengajuan/review lama belum diuji dalam batch redesign ini. | Belum dikerjakan |
| LINUSKU | Implementasi publik/admin/driver sudah berubah, audit visual semua halaman dan kondisi data belum selesai. | Navigasi terintegrasi, seluruh breakpoint dan dock belum diverifikasi. | Endpoint dan batas akses yang ada dipertahankan; status produksi tidak disimpulkan dari kode lokal. | Sebagian selesai |
| Jelajahi | Hub tersedia; seluruh subhalaman belum dipetakan visualnya. | Hub responsif belum direview sampai seluruh bagian. | Hanya tautan ke fitur aktif; modul tanpa backend khusus tetap tidak dibuat seolah tersedia. | Sebagian selesai |
| Dashboard Admin | Belum diperiksa ulang. | Belum diperiksa ulang. | Role, scope, dan izin belum diuji dalam batch redesign ini. | Belum dikerjakan |

### Rincian section Open PO (28 Nov 2026)

- **Diperbarui:** page header dan aksi ke pesanan/dashboard; form pencarian dan filter kampus dengan label; chip kategori mobile dan rail kategori desktop; daftar hasil dengan jumlah batch; kartu menampilkan kuota, progres, lokasi pickup, dan tenggat dari data batch; pesan katalog kosong dibedakan dari hasil filter kosong; error awal mendapat aksi muat ulang; dialog reservasi memakai focus trap yang sudah ada.
- **State:** route memiliki loading UI; empty, error, dan hasil filter kosong tersedia. Dialog menjaga Escape, urutan fokus, dan pengembalian fokus ke tombol pemanggil.
- **Belum tervalidasi:** kartu batch aktif pada browser, tampilan semua variasi data aktual, dan alur reservasi dengan sesi terotorisasi. Halaman tetap **Sebagian selesai**, bukan selesai.

### Rincian dashboard pengelola Open PO (28 Nov 2026)

- **Diperbarui:** header akun, ringkasan batch dan pesanan, daftar batch dengan progres kuota, status batch, formulir penerbitan, serta tab pesanan masuk dan pesanan saya. Kartu dan formulir menumpuk pada layar sempit dan memakai data yang diterima dari endpoint pengelola.
- **State dan interaksi:** loading, error dengan aksi coba lagi, state kosong per tab, pembukaan formulir, serta label status pesanan tersedia. Empat tes fixture memeriksa progres kuota, pergantian tab/status, label formulir, dan state loading/error.
- **Backend:** route `GET/PATCH /api/open-po/mine`, `POST /api/open-po`, dan `PATCH /api/open-po/orders` serta bentuk payload tidak diubah. Bentuk respons diverifikasi dengan membaca handler API; tes memakai fixture dan tidak mengakses data produksi.
- **Belum tervalidasi:** halaman dashboard mengalihkan pengunjung tanpa sesi ke login. Tidak ada sesi uji akun, sehingga screenshot desktop/mobile berisi batch nyata, hak akses, dan aksi pengelolaan tidak dapat diperiksa. Dashboard PO tetap **Sebagian selesai**.

### Rincian dashboard pengguna (28 Nov 2026)

- **Arah visual:** Clean Campus Modern dengan forest/lime sebagai aksen identitas. Header dan profil membentuk satu ringkasan akun, lalu navigasi workspace memisahkan pekerjaan barang, Open PO, tawaran, performa, dan profil. Dial Energy 2 / Rhythm 2 / Motion 1; komposisi menonjolkan tugas akun, bukan statistik contoh.
- **Diperbarui:** header akun, kartu identitas pengguna, navigasi dashboard, state loading/error, komposisi kartu barang aktif, Tawaran, dan Kebutuhan Dicari. Kartu aktif menggunakan gambar produk atau ikon netral ketika gambar tidak tersedia; seluruh angka ringkasan tetap berasal dari data dashboard.
- **Masih memakai struktur sebelumnya:** bagian Barang Menunggu Pembayaran, Riwayat Terjual, Barang Tidak Aktif, serta tab Statistik, PRO, Referral, Profil, Blog, dan UKM. Bagian ini perlu audit/redesign tersendiri sebelum halaman dapat berstatus selesai.
- **Backend:** pengambilan sesi, tab, endpoints, payload pembayaran/penjual, dan aksi barang tidak diubah. Browser mengalihkan ke halaman login tanpa sesi; tidak digunakan akun maupun data produksi untuk visual review.
- **Belum tervalidasi:** screenshot desktop dan mobile setelah login, semua tab, menu aksi keyboard dan layar sentuh, serta state nyata dari backend. Dashboard Pengguna tetap **Sebagian selesai**.

## Arah visual dan batas penggunaan referensi

Arah: **Clean Campus Modern** sebagai sistem utama karena paling dekat dengan palet yang ditetapkan pemilik dan font Plus Jakarta Sans yang sudah dipakai. Gunakan layout desktop web editorial/marketplace yang leluasa; terjemahkan layar app Stitch ke navigasi browser responsif, bukan aplikasi native.

- Token acuan: forest `#134e35`, deep green `#0a2e1f`, lime `#bef264`, background `#f4faf5`, surface `#ffffff`.
- Design read: komunitas USU/POLMED memakai marketplace dan layanan kampus; perlu navigasi jelas, densitas konten sedang, CTA yang nyata, dan suasana institusional yang hangat.
- Dial awal untuk iterasi UI: **Energy 2/5, Rhythm 2/5, Motion 1/5**; hierarchy tenang, grid rapi, animasi minim dan menghormati reduced-motion.
- Screenshot/HTML memuat nama, tanggal, jumlah pengguna, statistik, ETA/posisi bus, kontak, artikel, dan foto contoh. Semua dianggap placeholder desain; jangan dijadikan data website. Angka dan status hanya dari backend yang benar.
- Tidak menyalin HTML Stitch langsung. Pertahankan Plus Jakarta Sans dan komponen/icon yang sudah ada jika layak; jangan menambah dependency hanya untuk dekorasi.

## Arsitektur dan akses

- **Routing/rendering:** `src/app/**/page.*` dan `src/app/**/route.*`; global layout ada di `src/app/layout.jsx`, shell publik di `src/components/LayoutWrapper.jsx`.
- **UI/styling:** React/Next, Tailwind 3, CSS global di `src/app/globals.css`, token/komponen utilitas yang sudah ada di `src/components/ui/DesignSystem.jsx`. LINUSKU mempunyai CSS/layout sendiri dan tidak dibungkus shell publik; perubahan navigasi harus menangani shell itu terpisah.
- **State/data fetching:** page/client component memakai endpoint `/api/*`, server component, dan helper Supabase; tidak ada izin untuk mengganti payload/API demi tampilan.
- **Auth pengguna:** cookie sesi penjual yang ditandatangani server; endpoint tertentu memakai Supabase Auth bearer token. Akses penjual harus tetap server-side.
- **Admin:** `getAdminActor`/`hasAdminPermission` dan pemeriksaan scope role pada backend; UI bukan sumber otorisasi. Admin demo terpisah dan harus tetap terisolasi.
- **LINUSKU:** halaman, admin, driver, auth, dan endpoint tersendiri. Sumber data aktual mencakup `buses`, `stops`, `bus_positions`, `crowd_reports`, dan pengaturan; UI harus tetap menunjukkan kondisi data aktual/offline, tidak meniru ETA screenshot.
- **Supabase:** schema dikelola lewat migration yang ada. Audit ini tidak mengusulkan perubahan schema; semua penambahan data untuk Agenda, direktori fasilitas, atau Lost & Found perlu desain dan migration review terpisah jika backend memang belum memilikinya.

## Pemetaan fitur utama

| Halaman/alur | Komponen/halaman saat ini | API/data utama yang ditemukan | Akses dan catatan |
|---|---|---|---|
| Beranda/Jual Beli, daftar & pencarian | `/`, `/jual-beli`, `src/app/jual-beli/*` | `/api/listings`, kategori/settings; tabel `listings`, `seller_profiles`, `categories`/`settings` | Baca publik; aksi penjual lewat sesi. Pertahankan pencarian, kategori, stok, upload, dan aksi listing. |
| Detail/produk & toko | `/produk/[slug]`, `/toko/[slug]`, profil penjual | Listing/profil dan endpoint detail terkait | Listing publik; edit/aksi kepemilikan harus tetap terotorisasi server-side. |
| Jual/Edit barang | `/jual`, `/jual/edit/[id]` | `/api/listings`, route upload/storage yang ada; `listings`, `seller_profiles`, `universities` | Sesi penjual; jangan mengurangi field atau mengubah payload. |
| Barang Dicari/penawaran | `/dicari`, route penawaran | `/api/wanted`, `/api/offers`; `wanted_listings`, `price_offers`, blacklist terkait | Data pemilik dan penawar harus tetap diperiksa server-side. |
| Open PO | `/open-po`, detail/management yang tersedia | `/api/open-po`; `open_po_batches`, `open_po_orders`, `open_po_products`, `seller_profiles`; RPC pembuatan batch | Jangan ubah alur order/pembayaran/notifikasi. Validasi/rate limit dan session sudah ada. |
| Dashboard pengguna | `/dashboard` dan tab di `src/lib/dashboardTabs.js` | API auth, listings, wanted, offers, PO, blog, profil/statistik | Tab aktif: jual, dicari, tawaran, statistik, PRO, referral, profil, blog, UKM, open-po; permission UKM ditentukan akun. Jangan buat dashboard duplikat. |
| Chat/teman | `/chat`, `/teman`, `/cari-teman` | `/api/chat/*`, `/api/teman/*`; `chat_rooms`, `chat_messages`, `teman_*`, reports/bans | Sesi dan pemeriksaan room/partisipan; jalur teman mengarah ke mode chat. Jangan hilangkan pintasan chat saat navigasi disederhanakan. |
| Berita/penulis | `/blog` kini menjadi portal artikel; `/blog/[slug]` detail; `/mading` feed terpisah | `/api/blog`, `/api/mading`; `blogs`, `mading_posts`, likes/comments/replies | Portal membaca artikel berstatus published. Penulisan/review tetap memakai workflow lama; Mading dan Menfess tidak digabung ke feed editorial. |
| Organisasi/UKM | `/organisasi`, tab dashboard UKM, `/oprec` | `/api/organisasi` dan route oprec; `seller_profiles` serta data terkait | Ada data organisasi dan pendaftaran yang nyata. Pertahankan halaman, tidak mengarang jumlah/kegiatan. |
| FAQ | `/faq` | Konten/route FAQ yang ada | Pusat bantuan bisa ditautkan; jangan menambah hotline atau SLA yang tidak bersumber. |
| Jelajahi | `/jelajahi` hub sudah tersedia | Tautan ke fitur eksisting; belum ada sumber data seragam untuk semua submodul | Agenda, direktori fasilitas, dan Lost & Found terstruktur tetap ditandai belum tersedia. `/api/kampus` adalah data kampus/provinsi aktif, bukan bukti direktori gedung/fasilitas. |
| LINUSKU publik, driver & admin | `/linusku`, `/linusku/driver`, `/linusku/admin` | `src/app/linusku/api/*`; tabel transit dan akses terpisah | Pengguna/driver/admin punya batas akses berbeda; public map tidak boleh menampilkan posisi/ETA palsu. Shell ini tidak memakai `LayoutWrapper` publik. |
| Admin | `/admin/*` | 57 file route API admin terpetakan; tabel admin, listing, payment, PO, content, audit dan lain-lain | `getAdminActor`, `hasAdminPermission`, role + scope. Jangan mengandalkan hide/show menu sebagai proteksi. |
| Admin demo | `/admin-demo/*` | Rute dan komponen demo tersendiri | Pertahankan sebagai lingkungan terpisah, jangan menggabungkan data maupun API-nya ke admin produksi. |

## Temuan route dan UX yang memengaruhi redesign

- Setelah penambahan hub, inventaris source berisi **113 page routes**, **163 file API route** (file test dikecualikan), dan **2 file handler non-API**. Daftar route awal dilampirkan di bawah; tambahkan `/jelajahi` yang baru.
- Navigasi utama kini berisi Jual Beli, Open PO, LINUSKU, Berita, dan Jelajahi; akses akun dan aksi sekunder tetap di header.
- Dock mobile menampilkan lima tujuan utama dan label hanya pada menu aktif. Layout LINUSKU memakai navigasi situs yang sama dan mempertahankan shortcut Peta/Halte sebagai tautan bagian halaman.
- `/blog` kini menjadi portal berita; detail artikel dan halaman Mading tetap terpisah. Pemisahan feed editorial tidak mengubah API atau workflow penulis.
- Mading memiliki `info` dan `menfess`; tidak ditemukan tipe event atau lost/found terstruktur. Jangan memakai Mading atau daftar WTB seolah-olah kalender atau lost-and-found.
- LINUSKU tetap memakai layout khusus, bukan `LayoutWrapper`; navigasi utamanya terintegrasi, sedangkan Peta/Halte tetap tersedia sebagai anchor pada halaman.
- `home-v2`, V2 navbar/bottom nav, dan admin-demo adalah permukaan yang terpisah; jangan menyebarkan perubahan ke sana secara otomatis.
- Ada route redirect/alias lama; pertahankan URL kompatibel, jangan membuat route duplikat. Inventaris route mencatat semua page handler aktual; alias dapat dilihat di implementasi redirect/middleware.

## Risiko awal dan tindakan

1. **Credential-like values in `docs/api.md`:** contoh dokumentasi telah disanitasi di working tree tanpa menyalin nilainya. Kunci terkait tetap perlu dirotasi/invalidate melalui secret manager; perubahan file tidak menghapus nilai dari histori Git jika pernah tercatat di sana. Audit lokal tidak memeriksa `.env*` atau secret manager.
2. **Data placeholder Stitch:** semua artikel, foto, angka, lokasi, ETA, nomor kontak, dan statistik contoh tidak boleh dipakai di website.
3. **Modul Jelajahi tanpa backend khusus:** Agenda, direktori fasilitas, dan Lost & Found perlu ditandai jujur, bukan tombol dekoratif/data buatan.
4. **Kompatibilitas berita:** landing `/blog` kini editorial; detail artikel dan akses Mading/Menfess tetap harus diuji lintas route.
5. **Worktree dirty sebelum redesign:** perubahan Cloudflare, LINUSKU, bot, dan fitur lain harus tetap utuh. Tidak ada commit atau deploy dilakukan.

## Rencana batch implementasi

1. **Fondasi (sebagian selesai):** token warna, navigasi responsif lima tautan, hub Jelajahi yang jujur, dan integrasi shell LINUSKU sudah diterapkan. Audit komponen global dan konsistensi seluruh halaman masih perlu dilanjutkan.
2. **Marketplace/Open PO (sebagian):** halaman `/jual-beli`, detail `/produk/[slug]`, form Jual `/jual`, Form Edit `/edit/[id]`, etalase Open PO, dan workspace pengelolanya sudah diperbarui sebagian.
3. **Pengguna (sebagian):** header, identitas, navigasi, dan kartu barang aktif dashboard diperbarui; tab lain, profil/toko, chat, notifikasi, dan pengaturan masih perlu ditinjau.
4. **Berita/komunitas (sebagian):** portal editorial dibuat; detail, ruang penulis, Mading/Menfess, dan organisasi belum diredesign.
5. **LINUSKU:** mahasiswa, peta, driver dan admin; data backend asli saja.
6. **Jelajahi (sebagian):** hub dibuat; halaman modul hanya setelah sumber data/API dan permission terpetakan.
7. **Admin:** perapian workspace dan seluruh modul dengan role/scope existing.
8. **Finalisasi:** halaman lainnya, responsive/accessibility, regressions, lint, test, typecheck dan build. Tidak deploy tanpa izin.

## Implementasi berjalan

- **Pembacaan desain:** marketplace mahasiswa dalam arah Clean Campus Modern, ENERGY 2 / RHYTHM 2 / MOTION 1. Referensi Stitch dipakai sebagai inspirasi komposisi, bukan data atau markup. Desktop memakai kolom utama dan rail informasi; mobile menumpuk konten dan menyediakan ruang untuk dock.
- **Batch marketplace 28 November:** desktop kini memisahkan filter, katalog, dan informasi WTB/LINUSKU karena masing-masing melayani keputusan yang berbeda. Mobile menempatkan pencarian, filter yang dapat dibuka, aksi Jual/WTB berdampingan, banner Open PO, lalu kategori dan produk. FAB Jual Cepat dihapus karena menduplikasi aksi Jual dan menutupi judul katalog. Palet forest/lime mengikuti identitas Kampus Kita; tidak menambah data contoh.
- **Filter kategori dinamis:** opsi kategori memakai data kategori yang sudah dikirim halaman server. Saat memuat halaman berikutnya, filter DB-backed meneruskan nama kategori yang dipahami endpoint browse, tanpa perubahan API atau skema.
- **Komposisi marketplace:** pencarian/filter dan listing tetap memakai data serta kartu yang ada; dua aksi menuju form Jual dan WTB, CTA Open PO menuju halaman aktif, rail menampilkan permintaan WTB yang tersedia dan tautan LINUSKU. Tidak ditambahkan listing, PO, posisi bus, statistik, atau testimonial contoh.
- **Status fungsional:** kegagalan query awal kini dibedakan dari hasil kosong; kegagalan memuat halaman selanjutnya memberi pesan dan aksi coba lagi. Search, filter, sort, pagination, cart, detail, serta Chat WA tetap memakai alur existing.
- **Detail produk:** layout gallery/informasi tetap memakai data dan aksi existing. Jumlah dilihat, kondisi, profil, dan catatan tidak lagi diisi dengan angka atau klaim fallback; titik temu ditampilkan sebagai panduan, bukan pemilih satu opsi yang tidak mengubah apa pun. Galeri menyediakan tombol keyboard dan target sentuh yang lebih besar; halaman mendapat status loading yang responsif.
- **Form Jual:** alur tetap satu halaman scroll dengan preview listing; konfigurasi tarif memiliki status loading/error dan aksi coba lagi. Estimasi UI tidak menentukan hasil pembayaran, keputusan gratis atau QRIS mengikuti respons server, dan nominal QRIS menerima bentuk `amount` maupun `finalAmount`. Draft lokal tidak menyimpan nama atau nomor WhatsApp penjual. `MediaUploader` mendapat target sentuh dan dukungan keyboard yang lebih baik.
- **Form Edit:** tetap memakai endpoint dan payload lama. Permintaan data listing sekarang memiliki state loading/error, pesan API dipertahankan, dan kegagalan memiliki tombol coba lagi serta kembali ke dashboard. Kegagalan konfigurasi kategori ditampilkan, field kategori dikunci sampai konfigurasi termuat, dan ringkasan responsif menyebut kemungkinan review ulang yang memang diatur server.
- **Validasi listing:** schema bersama sekarang menerima tipe `poster`, yang sudah ditawarkan form dan dikenali jalur API; tipe tak dikenal tetap ditolak. Tidak ada endpoint, payload, database, migration, transaksi, role, atau permission yang diubah. Alur pembayaran produksi tidak disubmit saat validasi ini.

## Catatan validasi

- Lihat status validasi implementasi terkini di bawah; hasil audit awal bukan bukti seluruh halaman sudah diuji.
- `npm run lint`, `npx tsc --noEmit`, dan `npm run build` lulus setelah perubahan Form Jual dan Form Edit. Build mencatat fallback `getSettings` saat Next.js mencoba prerender route yang memakai request `no-store`; proses build tetap selesai dengan exit code 0 dan gejala ini perlu ditinjau terpisah.
- `npm test -- --maxWorkers=1` lulus: 95 file dan 478 test. Runner mencetak peringatan Fontconfig, tetapi seluruh test lulus.
- `npm run lint`, `npm test -- --maxWorkers=1`, `npx tsc --noEmit`, dan `npm run build` lulus untuk perubahan marketplace sebelum penghapusan FAB yang hanya berupa markup; ESLint terfokus dan pemeriksaan diff dijalankan lagi setelah markup akhir.
- Smoke test browser memverifikasi form Jual tampil, draft bisa dibersihkan, dan toggle tema berpindah gelap/terang. Form Edit dengan ID uji yang tidak ada menampilkan state error, tombol coba lagi mengulang pembacaan, dan tombol dashboard mengarah ke login karena tidak ada sesi.
- Marketplace: CSS lokal kembali berstatus 200 setelah dev server dimulai ulang pasca-build. Filter cepat Buku mengubah hasil, Semua mereset filter, disclosure mobile dapat dibuka/ditutup, dan pencarian memperbarui jumlah hasil. Pada lebar aktual yang dilaporkan browser, 487px, tidak ada horizontal overflow; permintaan 390px menghasilkan viewport 487px. Desktop terukur pada 1800px, dengan rail filter/katalog/informasi masing-masing berada di kolom terpisah; screenshot desktop tidak merepresentasikan seluruh lebar karena batas tampilan browser.
- Tidak ada listing yang diedit atau pembayaran yang dikirim. Form Edit dengan listing terotorisasi belum dapat diuji karena sesi penjual uji tidak tersedia.
- Dokumen tidak overflow pada lebar CSS aktual yang dilaporkan browser (464px pada Form Jual dan 469px pada state error Form Edit). Browser emulasi melaporkan ukuran CSS berbeda dari ukuran yang diminta (375px); breakpoint tepat 375px/768px dan visual regression penuh belum terverifikasi.
- Tidak ada pengujian Supabase production atau visual regression penuh.
- Open PO: `OpenPoClient` teruji dengan dua kasus terfokus (katalog aktif kosong/filter tanpa hasil; dialog bernama dapat ditutup dengan Escape dan mengembalikan fokus). Browser meninjau empty state pada 1440px dan 390×844, memilih kategori, memeriksa tema gelap/terang, serta memastikan CTA tetap dapat dicapai di akhir scroll. Katalog tidak mengembalikan batch aktif pada sesi review; reservasi dan payload tidak dikirim. Browser juga mencatat warning tag AdSense dan request telemetry pihak ketiga yang di-abort saat navigasi, bukan error dari alur Open PO.
- Bug lama harus dipisahkan dari regresi yang diperkenalkan redesign.

<details>
<summary>Page routes (113)</summary>

- **admin**: `/admin`, `/admin/admin-requests`, `/admin/ai`, `/admin/analytics`, `/admin/antrean`, `/admin/approve-payment`, `/admin/approve-toko`, `/admin/approve-unlock`, `/admin/audit`, `/admin/blogs`, `/admin/blogs/[id]`, `/admin/broadcast`, `/admin/broadcast_grup`, `/admin/content`, `/admin/dicari`, `/admin/distributor`, `/admin/emergency`, `/admin/finance`, `/admin/fyp`, `/admin/grouppost`, `/admin/instagram`, `/admin/kategori`, `/admin/keuangan`, `/admin/kontak_pembeli`, `/admin/listings`, `/admin/listings/[slug]`, `/admin/mading`, `/admin/marketplace`, `/admin/moderasi`, `/admin/notifikasi`, `/admin/obrolan`, `/admin/operasional-sumut`, `/admin/organization`, `/admin/overview`, `/admin/owners`, `/admin/pengaturan`, `/admin/penjual`, `/admin/penjual/[wa]`, `/admin/po`, `/admin/profil_request`, `/admin/rating`, `/admin/referral`, `/admin/reports`, `/admin/roles`, `/admin/settings`, `/admin/social`, `/admin/tawaran`, `/admin/teman`, `/admin/toko`, `/admin/transaksi`, `/admin/tren`, `/admin/users`, `/admin/vouchers`, `/admin/wabot`
- **admin-demo**: `/admin-demo`, `/admin-demo/antrean`, `/admin-demo/approve-toko`, `/admin-demo/audit`, `/admin-demo/blogs/[id]`, `/admin-demo/keuangan`, `/admin-demo/listings/[slug]`, `/admin-demo/moderasi`, `/admin-demo/overview`, `/admin-demo/penjual/[wa]`, `/admin-demo/tren`
- **blog**: `/blog`, `/blog/[slug]`
- **c**: `/c/[code]`
- **cara-bergabung**: `/cara-bergabung`
- **cari-teman**: `/cari-teman`
- **chat**: `/chat`
- **daftar-harga**: `/daftar-harga`
- **dashboard**: `/dashboard`, `/dashboard/login`, `/dashboard/open-po`, `/dashboard/toko`
- **dicari**: `/dicari`
- **distributor**: `/distributor/bergabung/[token]`
- **edit**: `/edit/[id]`
- **faq**: `/faq`
- **jelajahi**: `/jelajahi`
- **favorit**: `/favorit`
- **gabung-admin**: `/gabung-admin`
- **home-v2**: `/home-v2`
- **jasa**: `/jasa`, `/jasa/tawarkan`
- **jual**: `/jual`
- **jual-beli**: `/jual-beli`
- **kebijakan-privasi**: `/kebijakan-privasi`
- **keranjang**: `/keranjang`
- **linusku**: `/linusku`, `/linusku/admin`, `/linusku/driver`
- **mading**: `/mading`, `/mading/[id]`
- **offline**: `/offline`
- **open-po**: `/open-po`
- **oprec**: `/oprec`
- **organisasi**: `/organisasi`, `/organisasi/daftar`
- **panduan-aman**: `/panduan-aman`
- **penjual**: `/penjual/[wa]`
- **produk**: `/produk/[slug]`
- **profil**: `/profil`
- **progres**: `/progres`
- **refund-policy**: `/refund-policy`
- **return-policy**: `/return-policy`
- **root**: `/`
- **sosial**: `/sosial`
- **swap**: `/swap`
- **syarat-ketentuan**: `/syarat-ketentuan`
- **teman**: `/teman`
- **toko**: `/toko/[slug]`

</details>

<details>
<summary>API route files (163)</summary>

- **api/admin**: `/api/admin/action`, `/api/admin/admin-requests`, `/api/admin/ai-generate-broadcast`, `/api/admin/ai-test`, `/api/admin/analytics`, `/api/admin/analytics/commerce`, `/api/admin/analytics/national`, `/api/admin/audit`, `/api/admin/baileys`, `/api/admin/blogs`, `/api/admin/bot-logs`, `/api/admin/broadcast`, `/api/admin/broadcast-grup`, `/api/admin/broadcast/group-japri`, `/api/admin/broadcast/schedule`, `/api/admin/buyer-contacts`, `/api/admin/content`, `/api/admin/distribution`, `/api/admin/distributors`, `/api/admin/emergency`, `/api/admin/finance`, `/api/admin/finance/reconciliation`, `/api/admin/finance/vouchers`, `/api/admin/fyp/curation`, `/api/admin/google-auth/start`, `/api/admin/group-posts`, `/api/admin/instagram`, `/api/admin/keuangan`, `/api/admin/login`, `/api/admin/marketplace`, `/api/admin/migrate-lid`, `/api/admin/notify-listing`, `/api/admin/offers`, `/api/admin/organization`, `/api/admin/outbox`, `/api/admin/owners`, `/api/admin/po`, `/api/admin/profile-requests`, `/api/admin/push-katalog`, `/api/admin/referrals`, `/api/admin/reports`, `/api/admin/roles`, `/api/admin/scope-context`, `/api/admin/settings`, `/api/admin/social/accounts`, `/api/admin/social/dm-logs`, `/api/admin/social/instagram/oauth/callback`, `/api/admin/social/instagram/oauth/start`, `/api/admin/social/menfess-analytics`, `/api/admin/stores`, `/api/admin/subscriptions`, `/api/admin/teman`, `/api/admin/tren`, `/api/admin/upload`, `/api/admin/users`, `/api/admin/wa-inject`, `/api/admin/whatsapp/channels`
- **api/admin-demo**: `/api/admin-demo/audit`, `/api/admin-demo/buyer-contacts`, `/api/admin-demo/keuangan`, `/api/admin-demo/tren`
- **api/admin-requests**: `/api/admin-requests/apply`
- **api/analytics**: `/api/analytics/pwa-install`, `/api/analytics/seller`
- **api/auth**: `/api/auth/check`, `/api/auth/daftar-langsung`, `/api/auth/email/daftar`, `/api/auth/email/login`, `/api/auth/google-flow/clear`, `/api/auth/google-link/send-otp`, `/api/auth/google-link/start`, `/api/auth/google-link/verify-otp`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/phone-link/send`, `/api/auth/phone-link/verify`, `/api/auth/pin/verify`
- **api/blog**: `/api/blog`, `/api/blog/penulis`
- **api/chat**: `/api/chat/anon/inbox`, `/api/chat/anon/thread`, `/api/chat/marketplace/inbox`, `/api/chat/marketplace/start`, `/api/chat/match`, `/api/chat/room/[id]`, `/api/chat/room/[id]/exchange-contact`, `/api/chat/room/[id]/report`
- **api/config**: `/api/config`
- **api/cron**: `/api/cron/auto-bump`, `/api/cron/broadcast`, `/api/cron/daily-digest`, `/api/cron/deal-followup`, `/api/cron/distributor-digest`, `/api/cron/expire`, `/api/cron/instagram-menfess`, `/api/cron/omnichannel-distribution`, `/api/cron/weekly-report`
- **api/distributor**: `/api/distributor/invite`, `/api/distributor/invite/[token]`
- **api/fyp**: `/api/fyp/curation`
- **api/google-feed.xml**: `/api/google-feed.xml`
- **api/kampus**: `/api/kampus`
- **api/listings**: `/api/listings`, `/api/listings/[id]`, `/api/listings/[id]/instagram-image`, `/api/listings/[id]/view`, `/api/listings/batch`, `/api/listings/browse`
- **api/mading**: `/api/mading`, `/api/mading/[id]/comments`, `/api/mading/[id]/engagement`, `/api/mading/[id]/instagram-image`, `/api/mading/[id]/like`, `/api/mading/[id]/reply`, `/api/mading/[id]/report`
- **api/minat**: `/api/minat`
- **api/offers**: `/api/offers`, `/api/offers/[id]`
- **api/og**: `/api/og`
- **api/open-po**: `/api/open-po`, `/api/open-po/mine`, `/api/open-po/orders`
- **api/oprec**: `/api/oprec`, `/api/oprec/[id]`, `/api/oprec/[id]/submit`
- **api/organisasi**: `/api/organisasi`, `/api/organisasi/daftar`
- **api/outbound-ip**: `/api/outbound-ip`
- **api/payments**: `/api/payments/autobump`, `/api/payments/bump`, `/api/payments/featured`, `/api/payments/renew`, `/api/payments/resume`, `/api/payments/sponsored`, `/api/payments/subscribe`, `/api/payments/unlock-wanted`, `/api/payments/verify-receipt`
- **api/profil**: `/api/profil`
- **api/profile**: `/api/profile/change-request`
- **api/push**: `/api/push/subscribe`, `/api/push/subscribe/test`
- **api/ratings**: `/api/ratings`
- **api/report**: `/api/report`
- **api/settings**: `/api/settings/transaction-mode`
- **api/student**: `/api/student/verify`
- **api/subscriptions**: `/api/subscriptions/category`
- **api/teman**: `/api/teman/match-dm`, `/api/teman/matches`, `/api/teman/profiles`, `/api/teman/swipe`
- **api/toko**: `/api/toko`, `/api/toko/ajukan`, `/api/toko/cek-slug`, `/api/toko/ringkasan`
- **api/upload**: `/api/upload`
- **api/wa**: `/api/wa/baileys`, `/api/wa/bot-catalog-groups`
- **api/wanted**: `/api/wanted`, `/api/wanted/[id]`
- **api/webhook**: `/api/webhook/instagram`, `/api/webhook/trigger-ig`

</details>

<details>
<summary>Non-API handler files (2)</summary>

- **auth**: `/auth/callback`
- **chat-wa**: `/chat-wa/[id]`

</details>

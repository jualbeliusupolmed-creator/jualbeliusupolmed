# Laporan Pemulihan Fungsi dan Regresi

Tanggal: 28 November 2026
Ruang lingkup: pemulihan LINUSKU, pemetaan Open PO, Helpdesk/Lost & Found,
Agenda, pagination Mading/blog, keamanan Leaflet, sumber data WTB, serta
perbaikan build dan kompatibilitas crypto.

## Status repository dan batas operasional

- Saat pemeriksaan awal, `main` lokal tertinggal dua commit dari `origin/main`
  dan memiliki perubahan tracked/untracked. Snapshot/checkpoint awal disimpan
  di luar repository pada
  `~/.copilot/session-state/7e51c896-01e3-416a-bfb3-aa92497ab596/checkpoint-2026-11-28/`.
- Perubahan disimpan pada branch
  `feat/kampuskita-redesign-restoration-20261128` dengan commit fitur
  `98d9b4de`. `origin/main` kemudian diintegrasikan ke branch fitur; 21 konflik
  diselesaikan tanpa mengubah branch `main`. Integrasi belum dipush dan belum
  dibuat PR.
- Dua migration LINUSKU ditambahkan sebagai file sumber saja:
  `supabase/migrations/20261124125504_linusku_driver_access_requests.sql` dan
  `supabase/migrations/20261124133735_restrict_linusku_setting_rpc.sql`.
  Keduanya **tidak diterapkan** ke database.
- Tidak ada perubahan data produksi yang disengaja. Tidak ada endpoint produksi
  yang dipanggil untuk smoke test.

## Temuan dan hasil

| Area | Perubahan | Status dan batasan |
|---|---|---|
| LINUSKU driver/admin | Mengganti halaman placeholder dengan alur driver/admin, route `/linusku/api`, pemeriksaan sesi dan peran, serta helper akses Supabase server. Peta publik tetap di `/linusku`; payload bus/halte dirender lewat DOM aman. | Fungsi frontend dan API dipulihkan secara lokal. Belum diuji dengan akun atau database produksi. |
| Open PO | `OpenPoClient` sekarang memakai field API `photo`, `closes_at`, dan `reserved`; helper display menghitung waktu tutup/progres dari nilai backend dan tidak mengarang jumlah order/kuota. | Mapping konsisten dengan mapper server yang ada. |
| Helpdesk | Menghapus simulasi tiket dan konfirmasi sukses. UI menyatakan pengiriman belum tersedia; nomor kontak contoh dihapus. | Belum ada kontrak endpoint/tabel tiket yang sesuai. Tabel `reports` marketplace tidak dipakai ulang. |
| Lost & Found | Menghapus laporan, nama, tanggal, serta kontak sampel; tidak mengklaim laporan terkirim. | Belum ada backend laporan Lost & Found yang dapat digunakan. Memerlukan keputusan dan kontrak backend/migrasi terpisah. |
| Agenda | Mengambil konten `event` nyata dari Mading dengan state loading/error/empty/pagination. Tautan menuju pengumuman; tidak menyatakan pendaftaran berhasil. | Belum ditemukan layanan pendaftaran event. |
| Mading dan blog | Endpoint mendukung halaman dan jumlah total; klien memuat halaman berikutnya, menggabungkan data unik, menampilkan error, dan tetap mempertahankan bentuk respons blog lama untuk pemanggil tanpa parameter pagination. Sweep Instagram dibatasi ke pembacaan umum halaman pertama. | Tombol lanjut memuat data backend, bukan berhenti permanen pada 20 posting/5 artikel. |
| WTB | Beranda membaca `/api/wanted`, dengan state loading/error/empty; data daftar hardcoded dan badge jumlah bus palsu dihapus. | Error backend/wilayah yang belum diatur ditampilkan, bukan diganti data dummy. |
| Peta Leaflet | Mengganti interpolasi data bus/halte ke HTML dengan elemen DOM dan `textContent`; menambahkan uji input HTML berbahaya. | Fungsi peta dipertahankan; uji keamanan DOM lokal lulus. |
| Build halaman | Memperbaiki JSX pada empat halaman legal/daftar harga, membatasi `DEFAULT_PROVINCE_PERMISSIONS` sebagai konstanta internal route, dan mengimpor `cn` yang hilang pada form Jual. | Pemeriksaan tipe dan build final lulus. |
| Token admin dan Google-link | Memindahkan hash, HMAC, AES-GCM, encoding, dan random ke Web Crypto async; call site terkait menunggu Promise. | Menjaga format token lama; tes interoperabilitas dengan format Node crypto lama lulus. |

File implementasi utama:

- `src/app/linusku/admin/page.tsx`, `src/app/linusku/driver/page.tsx`, dan
  `src/app/linusku/api/`
- `src/app/open-po/OpenPoClient.jsx` dan `src/lib/openPoDisplay.js`
- `src/app/jelajahi/bantuan/page.jsx`,
  `src/app/jelajahi/lost-found/page.jsx`, dan
  `src/app/jelajahi/agenda/page.jsx`
- `src/app/mading/MadingClient.jsx`, `src/app/api/mading/route.js`, dan
  `src/app/api/blog/route.js`
- `src/app/SuperAppHome.jsx`, `src/components/LinusMap.jsx`, serta
  `src/lib/linusku/mapDom.js`
- `src/lib/cryptoCompat.js`, `src/lib/admin-user-token.js`, dan
  `src/lib/seller-google-link.js`
- `src/app/daftar-harga/page.jsx`, halaman kebijakan legal, serta
  `src/app/jual/JualClient.jsx`

## Verifikasi

### Pemeriksaan pemulihan awal

- `npm run lint` — lulus.
- Fokus: 5 file tes, 8 tes — lulus (pagination Mading/blog, deduplikasi,
  Open PO, dan rendering DOM aman).
- `git diff --check` dan `npm run check:meta-docs` — lulus.
- Putaran awal `npm test -- --run` mencatat 399 lulus dan 7 gagal pada
  `cryptoCompat`; empat halaman JSX juga masih menghalangi build/typecheck.
  Hasil awal ini digantikan oleh verifikasi lanjutan di bawah.

### Penyelesaian build dan kompatibilitas crypto

- Memperbaiki penutup JSX di `daftar-harga`, `kebijakan-privasi`,
  `refund-policy`, dan `syarat-ketentuan`; teks/konten legal tidak diubah.
- Next.js menemukan export non-route
  `DEFAULT_PROVINCE_PERMISSIONS` pada `src/app/api/admin/owners/route.js`;
  export dihapus karena hanya dipakai internal di file itu.
- Prerender menemukan `cn` yang belum diimpor di
  `src/app/jual/JualClient.jsx`; import helper `@/lib/utils` ditambahkan.
- `cryptoCompat` dan token admin/Google-link memakai Web Crypto async untuk
  kompatibilitas Workers tanpa `nodejs_compat`. Uji interoperabilitas
  memastikan AES-GCM dan HMAC tetap kompatibel dengan format Node crypto lama.
- `npm run lint` — lulus setelah integrasi upstream dan perbaikan regresi.
- `npm test -- --run` — **496 tes lulus, 0 gagal** di 102 file tes.
- Tes terarah token admin, Google-link, dan route start — **13 lulus**.
- `npx tsc --noEmit` — lulus; Next.js juga menyelesaikan pemeriksaan tipe pada
  build final.
- `npm run build` — **lulus**: kompilasi sukses, pemeriksaan tipe selesai,
  64/64 halaman statis terbangun.
- `npm run cloudflare:build` — **lulus**; OpenNext menghasilkan build Worker.
- Build memakai placeholder dan endpoint Supabase loopback; `.env.local` dan
  `.env.production.local` dipulihkan setelah build. Tidak ada data produksi,
  migrasi, deploy, atau request tulis yang digunakan.
- Karena backend sengaja tidak tersedia pada build terisolasi, beberapa
  `getSettings` mencatat fallback/cache saat Next melakukan prerender. Build
  tetap sukses; ini bukan validasi koneksi backend produksi.
- Tes marketplace setelah memperbaiki hitungan tayangan/riwayat produk dan
  state aksesibel Open PO — **6 lulus**.
- `git diff --check` — lulus sebelum build; perlu dijalankan lagi setelah
  perubahan dokumentasi/verifikasi terakhir.
- Worker dev tetap menjalankan snapshot `origin/main` commit `9703ae00`;
  build branch fitur ini tidak melakukan deployment.
- Tidak ada screenshot visual baru. Perubahan lanjutan pada UI hanya import
  helper class; dokumen legal hanya menerima koreksi sintaks. Tes dan build
  mencakup halaman LINUSKU, Open PO, Mading, WTB, marketplace, dashboard, dan
  halaman legal, tetapi bukan pengujian visual interaktif lintas viewport.

## Belum selesai / tindak lanjut

- Helpdesk dan Lost & Found perlu endpoint/schema yang dirancang dan ditinjau
  sebelum fitur kirim/baca laporan dapat diaktifkan. Tidak ada migration atau
  perubahan RLS yang dijalankan.
- Agenda belum memiliki alur registrasi; saat ini hanya menghubungkan pengguna
  ke pengumuman Mading yang tersedia.
- Lakukan smoke test LINUSKU dan halaman lain di lingkungan non-produksi dengan
  akun uji sebelum deployment.
- Verifikasi visual desktop/mobile interaktif masih perlu dilakukan sebelum
  mengklaim regresi visual nihil.
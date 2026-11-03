# Operasional perluasan jaringan kampus nasional

Status panduan: 2 November 2026. Ini adalah prosedur rollout, bukan klaim bahwa
seluruh jaringan telah diverifikasi atau siap menerima transaksi.

## 1. Katalog kampus dan provinsi

Panel **Admin → Struktur Wilayah & Kampus → Impor katalog nasional** menerima
CSV UTF-8 dengan kolom `NPSN`, `Nama Perguruan Tinggi`, dan `Provinsi`.
Pemisah koma maupun titik koma didukung. Data XLSX perlu diekspor menjadi CSV.
Impor menampilkan pratinjau, melewati nama/kode yang bentrok, dan membuat
entitas baru dalam status **nonaktif**. Impor tidak mengarang username
Instagram, tautan WhatsApp, admin, atau status kesiapan.

Sumber awal yang dapat dipakai untuk rekonsiliasi adalah dataset resmi
[Perguruan Tinggi Terakreditasi 2025 dari Pusdatin Kemdiktisaintek](https://data.kemdiktisaintek.go.id/dataset/data-jumlah-perguruan-tinggi-dan-status-akreditasi-pada-tahun-2025)
dan [PDDikti](https://pddikti.kemdiktisaintek.go.id/). Dataset akreditasi bukan
jaminan daftar seluruh cabang/titik kampus atau bahwa sebuah Instagram resmi
telah diklaim. Akses API/pertukaran data resmi mengikuti
[standar layanan data Kemdiktisaintek](https://kemdiktisaintek.go.id/api/file/humas-production/2022/06/KV-STANDAR-PELAYANAN-PUBLIK-DITJEN-DIKTI_rev7.pdf).

Urutan verifikasi sebelum aktivasi:

1. Rekonsiliasi NPSN/nama/provinsi terhadap PDDikti dan catat tanggal/sumber
   pengambilan dalam tiket operasional.
2. Tinjau nama ganda, perguruan tinggi multi-kampus, perubahan nama, merger,
   serta kampus cabang. Catat cabang sebagai unit pada induk yang benar.
3. Minta bukti kendali akun sosial resmi dari pengelola kampus/provinsi;
   jangan menebak handle dari nama institusi.
4. Tambahkan akun Instagram dan tokennya lewat Admin → Sosial → Instagram;
   tambah WhatsApp Channel/JID lewat formulir kanal. Uji koneksi tanpa
   menerbitkan konten.
5. Tugaskan admin dengan scope yang benar, verifikasi bahwa akun hanya melihat
   provinsi/kampus yang ditugaskan, lalu aktivasi entitas setelah checklist
   selesai.

Angka nasional di dashboard harus dihitung dari sumber dan tanggal snapshot
yang sama. Sebuah baris katalog nonaktif bukan kampus yang sudah beroperasi.

## 2. Setup Instagram terpisah untuk tiap akun

Setiap kampus/provinsi memasukkan Instagram Professional Account ID dan token
yang punya akses publikasi untuk akun Meta yang sama. Jalur UI memvalidasi
token terhadap ID sebelum menyimpannya. Token dienkripsi AES-256-GCM per akun
dan tidak pernah dikirim balik ke browser. Kunci enkripsi hanya disetel sebagai
environment variable server-side `META_ACCOUNT_TOKEN_ENCRYPTION_KEY`, berupa
32 byte acak yang dikodekan Base64. Siapkan di secret manager Vercel untuk
semua environment yang akan menjalankan API/cron; jangan masukkan ke
`NEXT_PUBLIC_*`, source, atau dokumen. Rotasi kunci harus didahului rencana
dekripsi dan enkripsi ulang seluruh kredensial; mengganti kunci begitu saja
akan membuat token lama tidak dapat dibaca.

Alur menggunakan integrasi Graph API Facebook Login yang sudah ada di kode:
akun harus Professional dan tertaut ke Facebook Page. Gunakan izin Meta yang
sesuai untuk membaca halaman dan menerbitkan konten Instagram; token bisa
dicabut atau kedaluwarsa, jadi indikator **Terhubung** perlu diuji ulang
berkala. UI saat ini menyediakan koneksi per akun tetapi belum memakai OAuth
multi-tenant otomatis; operator memasukkan token yang dibuat di Meta.

## 3. Preflight database produksi

Gunakan berkas [audit-supabase-produksi-readonly.sql](./audit-supabase-produksi-readonly.sql)
di SQL Editor Supabase. Jalankan hanya query metadata yang sesuai dengan
ekstensi terpasang. Jangan jalankan migrasi berdasarkan selisih daftar saja.
Bandingkan versi migrasi remote dengan file lokal; periksa RLS, grants,
policies, fungsi SECURITY DEFINER, serta Security Advisor.

Security Advisor dibuka dari Supabase Dashboard → **Advisors → Security**.
Simpan finding dan status tindak lanjut. Setelah perubahan, jalankan kembali
Advisor. Untuk bukti produksi, catat waktu pemeriksaan, project ref, jumlah
finding per tingkat, dan versi migrasi; jangan mencatat isi baris pelanggan.
Session ini tidak memiliki hasil verifikasi produksi terbaru, sehingga status
migrasi/RLS/Advisor tetap **belum diverifikasi** sampai pemilik menjalankan
preflight tersebut.

## 4. Jadwal worker dan batas paket

Pemicu omnichannel lima menit menggunakan Supabase Cron sesuai
[docs/cron-setup.md](./cron-setup.md). Dokumentasi Vercel menyatakan Hobby
membatasi cron paling sering sekali sehari, sedangkan Pro/Enterprise mendukung
per menit. Paket proyek belum diverifikasi langsung. Dengan scheduler di
Supabase, worker ini tidak memerlukan cron lima menit dari Vercel.

Pastikan `CRON_SECRET` tersedia pada runtime Vercel dan nilai yang sama berada
di Supabase Vault dengan nama `omnichannel_cron_secret`. Setelah memasang
jadwal, periksa riwayat eksekusi dan status antrean. Uji pertama gunakan listing
dan akun percobaan yang tidak akan membuat post publik.

Supabase mendokumentasikan bahwa header Authorization dari `pg_net` masuk
sementara ke antrean request dan dapat dibaca oleh peran yang memiliki koneksi
database langsung. Batasi koneksi langsung ke operator tepercaya; jangan kirim
service-role key melalui pola ini. Vault melindungi penyimpanan saat diam,
tetapi tidak menyamarkan header request setelah didekripsi untuk dikirim.

## 5. Uji cakupan dan pengiriman

Uji lokal wajib meliputi:

- superadmin dapat melihat seluruh katalog;
- admin provinsi A tidak bisa membaca atau mengubah provinsi B;
- admin kampus A tidak bisa mengubah akun kampus B;
- distribusi memilih akun kampus dan provinsi yang tepat;
- job tanpa token, dengan token salah, atau scope/destination yang diubah ditolak;
- retry dan pemanggilan worker bersamaan tidak membuat pengiriman duplikat
  secara normal.

Uji publikasi eksternal harus dilakukan terpisah pada akun percobaan, satu
kanal per kali, setelah persetujuan eksplisit pemilik kanal. Hasil Meta yang
berhasil tetapi gagal dicatat ke database dapat menciptakan keadaan ambigu;
periksa akun tujuan sebelum mengulang job. Jangan mengklaim at-most-once untuk
API eksternal yang tidak menyediakan kunci idempotensi bagi operasi tersebut.

## Bukti dan batas status saat dokumen ini ditulis

- Setup per akun dan impor CSV tersedia di working tree lokal.
- Pemasangan Supabase Cron, pengaturan environment produksi, migrasi, security
  advisor, uji role produksi, dan pengiriman publik belum dilakukan oleh
  perubahan ini.
- Catat hasil aktual di sini setelah langkah produksi diselesaikan; jangan
  mengubah status menjadi “siap nasional” hanya karena kampus ada di katalog.

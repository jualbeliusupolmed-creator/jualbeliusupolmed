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

## 3. Status keamanan database produksi

Gunakan berkas [audit-supabase-produksi-readonly.sql](./audit-supabase-produksi-readonly.sql)
di SQL Editor Supabase. Jalankan hanya query metadata yang sesuai dengan
ekstensi terpasang. Jangan jalankan migrasi berdasarkan selisih daftar saja.
Bandingkan versi migrasi remote dengan file lokal; periksa RLS, grants,
policies, fungsi SECURITY DEFINER, serta Security Advisor.

Pada 4 November 2026, project Supabase `autgrnrqeqdpqwkbolyh` diperiksa melalui
MCP. Migrasi `20261104114446_lock_prohibited_keywords_to_server_role` tercatat
di produksi. Tabel `prohibited_keywords` kini memakai RLS dan tidak memberi
akses tabel langsung kepada `anon`/`authenticated`; operasi server dengan
`service_role` tetap diizinkan.

Security Advisor terbaru tidak lagi melaporkan tabel dengan RLS mati. Advisor
melaporkan 63 tabel RLS aktif tanpa policy. Untuk tabel yang sengaja hanya
diakses API server, ini menutup akses langsung melalui Data API; tetap tinjau
per tabel agar tabel yang memang harus dipakai klien mendapat policy sempit
berdasarkan pemilik/scope. Advisor juga melaporkan 7 fungsi Open PO
`SECURITY DEFINER` yang dapat dipanggil `authenticated`. Fungsi tersebut
memeriksa `auth.uid()` dan kepemilikan sebelum membaca/mengubah data, tetapi
perlu pemeriksaan kode dan uji negatif lintas akun sebelum menyatakan isolasi
produksi tuntas. Jangan mencabut izin atau mengganti mode keamanan tanpa uji
alur pemesanan.

Fitur perlindungan kata sandi bocor masih nonaktif di konfigurasi Supabase Auth.
Temuan ini perlu diaktifkan dan dicek dari dashboard Auth. Audit Advisor tidak
membuktikan seluruh aplikasi bebas risiko; hasil berlaku pada waktu pemeriksaan
di atas.

## 4. Jadwal worker dan batas paket

Pemicu omnichannel masih belum siap produksi. Pemeriksaan Supabase pada
4 November 2026 tidak menemukan ekstensi `pg_cron`/`pg_net`, job
`omnichannel-distribution-every-5m`, atau rahasia di Vault. Vercel menolak
deployment `83831f3` karena jadwal `*/10` melampaui batas Hobby; jadwal itu kini
dihapus dari `vercel.json`. Deployment perbaikan dan aktivasi Supabase Cron
belum diverifikasi.

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

- Pemeriksaan 4 November 2026: 10 provinsi dan 14 universitas aktif di katalog;
  universitas hanya terpetakan pada 5 provinsi. Lima provinsi belum memiliki
  entri universitas.
- Cakupan akun sosial: 41 entri (3 Instagram terhubung dari 20; 17 belum
  terhubung; 2 WhatsApp Channel terhubung dari 20; 18 belum; 1 grup WhatsApp
  terhubung). Status database belum membuktikan percobaan kirim berhasil.
- Checklist rollout: 1 berstatus `fully_launched`, 2 `onboarding`, dan 3
  `draft`; ini belum membuktikan kesiapan nasional.
- Relasi akun: 9 dari 334 profil penjual memiliki `user_id`; 325 belum tertaut.
  Pautan WhatsApp/Google ber-OTP tersedia. Backfill otomatis dari nama/nomor
  tidak aman tanpa bukti verifikasi.
- Migrasi penguncian `prohibited_keywords` tercatat di Supabase produksi;
  migrasi tidak mengubah isi tabel. Advisor tidak lagi menemukan tabel RLS
  mati, tetapi masih melaporkan 63 tabel tanpa policy dan 7 RPC Open PO
  `SECURITY DEFINER` yang harus terus ditinjau.
- Uji unit/lint lokal dapat dijalankan di repo. Uji isolasi lintas akun
  provinsi/kampus dan publikasi nyata belum dilakukan.
- Deployment Vercel setelah penghapusan jadwal cepat, rahasia runtime, dan
  riwayat cron belum dapat diperiksa dari sesi ini.
- Catat hasil aktual di sini setelah langkah produksi diselesaikan; jangan
  mengubah status menjadi “siap nasional” hanya karena kampus ada di katalog.

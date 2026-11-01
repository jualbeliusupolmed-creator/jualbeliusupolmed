# Rencana: Jual Barang lewat Instagram DM

Tanggal: 2 November 2026  
Status: perencanaan berdasarkan audit kode; belum ada perubahan database atau konfigurasi produksi.

## Tujuan dan keputusan yang sudah disepakati

- Fase awal Instagram DM hanya untuk **membuat iklan jual barang**. Pencarian barang dan pembelian lewat DM tidak termasuk.
- Penjual memberikan nomor WhatsApp dan membuktikan kepemilikannya dengan OTP. Penautan IG ke akun Jual Beli cukup sekali.
- Kata sandi web tidak pernah diminta atau dikirim lewat Instagram/WhatsApp. Kata sandi hanya dimasukkan pada halaman login resmi.
- Akun IG kampus menentukan kampus iklan. Website tetap menjadi sumber utama status iklan dan transaksi.
- AI boleh membantu membaca foto/teks, menyarankan judul/deskripsi/kategori, dan memberi sinyal moderasi. Penjual mengonfirmasi detailnya; AI bukan bukti pembayaran dan tidak boleh sendirian mengaktifkan iklan yang berisiko.
- Jika mode berbayar aktif, biaya listing mengikuti pengaturan dan aturan perhitungan yang sama dengan web. QRIS biaya platform berbeda dari pembayaran harga barang oleh pembeli.

## Kondisi kode saat audit

- Penerima webhook berada di `src/app/api/webhook/instagram/route.js`; router DM berada di `src/lib/instagramDmRouter.js`.
- Router saat ini memuat alur jual, cari barang, dan menfess. Alur jual meminta nomor WA lalu membuat listing aktif secara langsung, memakai kampus `Semua`, dan menyebarkannya ke kanal lain.
- Proses tersebut belum mengikat Instagram sender ke profil penjual terverifikasi dan belum memakai alur listing web yang memusatkan tarif, masa tayang, pemeriksaan, serta status.
- Endpoint listing web memakai moderasi deterministik + AI dan status pending untuk kiriman yang perlu ditinjau. Pengaturan bawaan saat audit menyalakan mode gratis.
- Endpoint webhook masih menerima token verifikasi tetap yang tertulis di kode; validasi tanda tangan POST juga dilewati jika `META_APP_SECRET` tidak tersedia. Keduanya perlu ditutup sebelum webhook produksi diandalkan.
- OTP WhatsApp sudah digunakan pada beberapa alur akun, tetapi alur yang ada punya konteks dan efek samping sendiri. Kode OTP pemulihan sandi tidak boleh dipakai ulang untuk menautkan Instagram.
- `src/app/api/listings/route.js` perlu dibereskan dan diuji khusus untuk alur berbayar: pada jalur yang diperiksa, respons iklan aktif/pending dikirim sebelum bagian pencatatan pembayaran di bawahnya.
- Dokumen setup Meta yang ada berfokus pada publikasi Instagram dan belum menjelaskan izin, webhook subscription, serta akun IG per kampus untuk fitur DM.

## Alur produk yang dituju

1. Pengguna mengirim `JUAL` ke akun IG kampus.
2. Bot menjelaskan bahwa nomor WA akan dipakai untuk menautkan akun JB dan meminta persetujuan.
3. Pengguna memasukkan nomor WA. Sistem membuat tantangan OTP sekali pakai yang terikat pada IG sender dan nomor tujuan, lalu mengirim OTP ke WA.
4. Pengguna membalas OTP ke bot WA. Server memverifikasi kode, masa berlaku, batas percobaan, dan konflik nomor; setelah valid, identitas IG dan profil JB ditautkan sekali.
5. Bot mengumpulkan foto dan detail barang. AI membantu menyusun isian, lalu penjual melihat dan mengonfirmasi ringkasan.
6. Server memvalidasi akun, kampus, harga, foto, aturan bisnis, duplikasi, pembatasan spam, dan tarif dari sumber kebenaran web.
7. Mode gratis: iklan masuk moderasi. Mode berbayar: buat tagihan biaya platform yang terikat pada draft; iklan menunggu verifikasi pembayaran dan moderasi.
8. Setelah syarat terpenuhi, iklan tayang di web. Distribusi ke WA/IG mengikuti status aktif dan izin kanal kampus.
9. Bot mengirim status dan tautan web kepada penjual. Pembaruan terjual, batal, ditolak, dan kedaluwarsa tetap bersumber dari data iklan web.

## Tahapan kerja dan gerbang

### 0. Baseline dan aturan keamanan

- Catat kondisi branch, deployment, dan integrasi Meta tanpa menampilkan token atau isi DM pengguna.
- Tutup token verifikasi tetap; wajibkan `META_APP_SECRET` untuk menerima POST webhook produksi dan tolak signature hilang/tidak valid.
- Verifikasi event, akun penerima, echo, duplikasi webhook, serta respons cepat Meta. Tambahkan idempotensi agar retry Meta tidak membuat iklan ganda.
- **Gerbang:** pengujian webhook dapat membuktikan hanya event bertanda tangan valid yang diproses.

### 1. Batas fase jual saja

- Pertahankan state machine jual; keluarkan opsi cari barang dan menfess dari entry point DM untuk fase ini.
- Tambahkan pembatalan, kedaluwarsa draft, pemulihan setelah retry, dan perlindungan dari pesan duplikat.
- **Gerbang:** alur DM tidak dapat memulai atau mengirimkan pencarian/pembelian/menfess.

### 2. Penautan akun WA/IG satu kali

- Rancang tabel privat untuk tantangan penautan dan pemetaan identitas IG, dengan kunci unik, expiry, jumlah percobaan, status pemakaian, dan audit minimal.
- Jangan gunakan tabel OTP login/pemulihan yang ada tanpa desain terpisah. Simpan hash OTP saja, kirim melalui gateway WA yang disetujui, batasi laju per IP/IG/nomor, dan cegah satu nomor mengklaim beberapa profil.
- Balasan OTP diterima hanya dari nomor WA tujuan melalui bot; jangan meminta kata sandi di chat.
- **Gerbang:** migrasi ditinjau, RLS diuji, dan alur OTP tidak dapat membuat sesi web atau mengganti PIN/sandi.

### 3. Draft listing dan AI

- Gunakan layanan validasi, moderasi, sanitasi, tarif, masa tayang, dan penyimpanan listing yang sama dengan web; hindari insert langsung berbeda di router DM.
- Sediakan pratinjau yang dapat dikoreksi penjual. Moderasi berisiko masuk antrean admin; belum ada auto-publish dari DM pada pilot.
- Batasi tipe/ukuran gambar dan ambil media dengan kontrol akses serta waktu tunggu yang jelas; jangan menyimpan seluruh chat jika tidak dibutuhkan.
- **Gerbang:** setiap draft punya pemilik terverifikasi, kampus yang benar, jejak status, dan tidak tayang sebelum aturan listing terpenuhi.

### 4. Tarif dan QRIS

- Perbaiki urutan alur pembayaran listing web terlebih dahulu: hitung biaya server, buat pembayaran idempoten, dan jangan mengembalikan sukses sebelum status tagihan tersimpan.
- Gunakan fungsi perhitungan pusat dan pengaturan admin yang sama dengan web. Jangan menanam angka tarif di bot.
- QRIS biaya listing tidak diperlakukan sebagai pembayaran harga barang. AI/OCR bukti transfer tidak mengesahkan pembayaran; gunakan mekanisme verifikasi pembayaran yang memang tersedia.
- **Gerbang:** uji gratis dan berbayar menunjukkan jumlah tagihan, status pembayaran, dan aktivasi listing konsisten; belum ada perubahan tarif produksi tanpa keputusan pemilik.

### 5. Admin, pilot, dan perluasan kampus

- Moderasi antrean DM, alasan penolakan, audit tindakan, dan status pembayaran harus terlihat pada dashboard admin yang sesuai scope kampus/provinsi.
- Pilot pada satu akun kampus yang memenuhi persyaratan Meta; awalnya peninjauan manual dan distribusi eksternal terkontrol.
- Setelah metrik error, spam, konversi draft, pembayaran, dan waktu moderasi stabil, baru tambah kampus dan akun IG secara bertahap.
- Setiap akun IG dipetakan eksplisit ke satu entitas kampus aktif; provinsi mengatur kurasi FYP, bukan mengganti kampus asal iklan.
- **Gerbang:** ada panduan operasi, pemilik akun, pemulihan token, rollback, dan dukungan admin sebelum perluasan.

## Belum diputuskan / perlu verifikasi sebelum peluncuran

- Apakah semua listing DM perlu persetujuan moderator sebelum tayang, termasuk yang lolos moderasi otomatis. Rekomendasi pilot: ya.
- Apakah biaya berbayar yang dimaksud adalah biaya pasang iklan platform. Rekomendasi: ya; pembayaran barang oleh pembeli tetap di luar DM.
- Provider dan izin Meta yang tersedia untuk menerima DM dari setiap akun IG kampus, serta batasan webhook/API yang berlaku.
- Metode verifikasi pembayaran QRIS yang saat ini aktif di production dan pemilik proses peninjauannya.
- Mekanisme unggah foto yang aman dan ukuran/format yang diizinkan.

## Batas perubahan saat ini

Audit dan rencana ini tidak mengubah kode produk, skema Supabase, RLS, data, token, atau konfigurasi Meta/Vercel. Migrasi, perubahan RLS, penyambungan akun produksi, dan pengiriman pesan nyata harus ditinjau sebelum dijalankan.

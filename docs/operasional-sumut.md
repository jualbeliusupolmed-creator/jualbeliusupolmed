# Operasional JualBeliDiKampus di Sumatera Utara

**Kendali platform bersifat nasional; operasi yang sudah disiapkan saat ini
berfokus di Sumatera Utara.** Superadmin bebas menyiapkan katalog, admin,
scope, dan kanal di provinsi mana pun. Menyiapkan wilayah tidak otomatis
mengumumkan bahwa wilayah itu sudah beroperasi atau siap menerima distribusi.
Pemilik menyatakan admin Sumut sudah disiapkan; cakupan akun dan detail
penanggung jawab tetap perlu dicatat pada register agar mudah diaudit.

## 1. Cakupan dan penanggung jawab

Struktur kerja: superadmin nasional → admin provinsi → operator
universitas/kampus. Admin Sumut sudah disiapkan sesuai arahan pemilik.
Superadmin tetap dapat mengelola semua provinsi dan menetapkan admin di
wilayah mana pun. Universitas dan kampus adalah satu entitas. Cabang atau unit
dicatat di bawah universitas induk bila diperlukan.

Sebelum suatu kampus disebut aktif beroperasi, catat dan verifikasi:

| Yang dicatat | Bukti minimum |
| --- | --- |
| Universitas dan unit/cabang | Nama, kode, provinsi, induk bila cabang, dan status aktif yang benar |
| Operator utama dan pengganti | Akun Auth yang benar, scope dan modul sesuai tugas, serta cara eskalasi |
| Instagram | Handle, pemilik, scope kampus/provinsi, status koneksi, dan hasil uji publikasi |
| WhatsApp | Nomor/perangkat bot, grup atau channel tujuan, pemilik tujuan, dan hasil pesan uji yang disetujui |
| Alur jualan | Listing uji dari masuk sampai kontak penjual; catat titik gagal dan penanggung jawabnya |

Kelola akun melalui **Admin → Akses owner**, dan katalog melalui
**Admin → Struktur wilayah**. Jangan mengisi nama operator atau menyatakan
akun siap hanya berdasarkan data contoh/default. Audit terakhir yang tercatat
di knowledge proyek menemukan 10 provinsi aktif dan 14 universitas aktif pada
5 provinsi; data itu merupakan status katalog, bukan daftar wilayah yang sudah
disetujui beroperasi. Validasi ulang sebelum dipakai sebagai baseline baru.

Gunakan register berikut saat melakukan rekonsiliasi dengan katalog langsung.
Baris belum dianggap siap sampai ada bukti dan tanggal pemeriksaan.

| Universitas | Unit/cabang | Operator utama | Pengganti | Instagram | Grup/channel WhatsApp | Uji listing | Status dan tanggal cek |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  | Belum diverifikasi |
|  |  |  |  |  |  |  | Belum diverifikasi |
|  |  |  |  |  |  |  | Belum diverifikasi |

## 2. Alur jualan satu listing

1. Penjual memasukkan barang lewat web atau alur jual yang telah tersedia.
2. Operator memeriksa judul, foto, harga, kondisi, kampus, kontak penjual,
   ketersediaan, serta apakah barang sesuai aturan.
3. Listing yang lolos ditayangkan di marketplace. Jika perlu, kurator memilihnya
   untuk FYP Sumut.
4. Operator membagikan listing ke akun sosial atau tujuan WhatsApp yang benar
   untuk lingkupnya. Setiap pesan harus kembali ke URL listing web.
5. Pembeli membuka listing dan menghubungi penjual. Klik WhatsApp atau pesan
   yang terkirim hanya menunjukkan upaya kontak.
6. Status terjual dicatat setelah penjual/operator memperoleh konfirmasi yang
   memadai. Jangan menghitung nilai listing atau status sold sebagai GMV
   terverifikasi tanpa bukti pembayaran/transaksi yang sesuai.

Titik kontrol: listing tanpa wilayah, kontak rusak, stok tidak diketahui,
tujuan distribusi tidak cocok, atau hasil kirim yang gagal harus ditahan dan
ditugaskan untuk ditindaklanjuti.

## 3. Metrik operasi dan batas data

Gunakan periode dan cakupan kampus yang sama untuk setiap rekap.

| Metrik | Definisi | Kesiapan data |
| --- | --- | --- |
| Listing masuk | Listing dibuat pada periode laporan | Tersedia dari `created_at`; filter cakupan perlu dipilih |
| Listing aktif/pending/terjual | Jumlah per status pada akhir periode | Status tersedia; `sold` belum otomatis menjadi bukti transaksi |
| Waktu review | Waktu dari dibuat sampai keputusan pertama | Belum ada metrik keputusan pertama yang tervalidasi; jangan klaim SLA dari hitungan manual tanpa catatan |
| Views | Jumlah views listing | Tersedia; bukan pengguna unik atau minat beli |
| Distribusi sosial | Jumlah job berhasil/gagal per penyedia dan scope | Log job tersedia; status job tidak membuktikan jangkauan/engagement audiens |
| Kontak tercatat | Permintaan kontak dari halaman listing/minat yang tercatat di `buyer_contacts` | Dapat direkap per listing Sumut untuk 30 hari terakhir; menunjukkan upaya kontak, bukan bukti halaman WA dibuka atau chat berlangsung |
| Konfirmasi penjual | Balasan `DEAL` atau `GAGAL` dari penjual melalui bot WhatsApp | Tersedia sebagai laporan mandiri penjual; belum diverifikasi dengan bukti pembayaran atau pembeli |
| Transaksi dan pendapatan | Pesanan selesai dan jumlah yang benar-benar dibayar | Perlu bukti status transaksi/pembayaran; jangan menyamakan dengan listing sold atau nilai barang |

Rekap mingguan minimal: tanggal awal/akhir, kampus, listing baru, aktif,
pending, terjual, views, distribusi berhasil/gagal, laporan terbuka, isu,
penanggung jawab tindak lanjut. Tandai data yang tidak tersedia sebagai
“belum tercatat”; jangan mengisinya dengan nol.

Salin format ringkas berikut untuk setiap evaluasi mingguan:

| Periode | Kampus | Baru | Aktif | Pending | Terjual* | Views | Distribusi sukses/gagal | Laporan terbuka | Isu dan tindakan | PIC |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- | --- |
|  |  |  |  |  |  |  |  |  |  |  |

`*` Status listing terjual, bukan otomatis transaksi terverifikasi. Tambahkan
catatan metode dan bukti jika melaporkan transaksi atau pendapatan.

## 4. Ritme dan SOP

### Harian

- Periksa listing pending, laporan pengguna, dan permintaan perubahan profil.
- Periksa status bot/akun sosial serta job distribusi gagal.
- Pastikan unggulan FYP masih aktif, relevan, tersedia, dan menuju halaman yang
  benar.
- Catat insiden dengan ID listing/job, waktu, gejala, tindakan, dan pemilik
  tindak lanjut. Hindari memasukkan nomor telepon atau token ke catatan.

### Mingguan

- Rekap metrik dari tabel di atas berdasarkan kampus dan periode yang sama.
- Tinjau barang lama/tidak tersedia dan distribusi yang gagal.
- Minta konfirmasi singkat operator kampus mengenai listing dan hasil jual.
- Bahas laporan berulang, kategori kosong, serta masalah kontak/tautan; tetapkan
  tindakan dan pemiliknya.

### Eskalasi

- Salah tujuan atau potensi paparan data: hentikan distribusi terkait dan
  eskalasi segera ke superadmin.
- Gangguan bot, OAuth, atau antrean: simpan ID job dan waktu, periksa log yang
  telah disamarkan; jangan mengulang pengiriman massal sebelum penyebab jelas.
- Sengketa transaksi/laporan keselamatan: ikuti kebijakan moderasi dan catat
  keputusan; jangan menjanjikan pengembalian dana yang tidak didukung alur.

## 5. Kendali nasional dan kesiapan operasi

Superadmin boleh menyiapkan wilayah mana pun melalui **Struktur wilayah** dan
**Akses owner**; tidak ada pembatasan teknis ke Sumut. Status katalog atau
akun saja bukan bukti kesiapan operasi. Sebelum distribusi dan operasi rutin
dibuka pada wilayah mana pun, pastikan:

- operator utama dan pengganti ditunjuk dengan scope akses yang tepat;
- katalog universitas/cabang dan tujuan kanal telah diverifikasi;
- alur listing → review → tayang → kontak → pencatatan hasil diuji;
- akun sosial dan WhatsApp sudah tersambung dan lulus uji terkendali;
- metrik mingguan dan SOP sudah dijalankan stabil pada wilayah pilot saat ini;
- jalur eskalasi dan pemulihan layanan sudah dipahami.

Keputusan untuk menjalankan operasi di luar Sumut tetap dibuat oleh pemilik.
Dengan demikian superadmin dapat menyiapkan lebih dulu, sementara wilayah
tersebut tetap berstatus persiapan sampai prasyarat operasional diverifikasi.

Halaman panduan dalam panel: **Admin → Panduan operasional Sumut**. Kartu
“Kesiapan live” mengambil katalog, penanggung jawab, akun sosial, grup/kanal,
dan ringkasan jualan dari API panel. Jika sebagian sumber gagal, tampilkan
“belum tersedia” dan jangan menafsirkannya sebagai nol. Kontak dan konfirmasi
penjual dihitung dari kolom agregat saja; data nomor telepon dan nama tidak
dikirim ke tampilan analitik. Angka 30 hari dibatasi pada maksimal 20.000
listing untuk menjaga beban kueri dan akan diberi tanda jika batas tercapai.

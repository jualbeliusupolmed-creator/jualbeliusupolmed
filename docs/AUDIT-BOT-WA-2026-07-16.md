# 📋 Laporan Audit Bot WhatsApp — Jual Beli USU Polmed

**Tanggal:** 16 Juli 2026
**Auditor:** Claude (analisis kode + transkrip)
**Sumber data:** 7 ekspor chat WhatsApp asli (folder `Pelajari wa/`) — 6 chat pelanggan + 1 chat uji owner
**Metode:** Baca transkrip end-to-end + cocokkan tiap gejala ke kode sumber (`wa-bot-usu/index.js`, `src/app/api/wa/baileys/route.js`, `src/lib/gemini.js`)
**Catatan:** Nomor pelanggan disamarkan sebagian. File "Ridho Pasi" sebagian besar berisi bot keuangan pribadi (bukan marketplace) + log debug lama — hanya bagian marketplace yang dipakai.

---

## 1. Ringkasan Eksekutif

Bot ini **fungsional dan berkarakter** — verifikasi anti-bajak jalan, fitur Cari/Dicari/Jual bekerja, dan gaya bahasanya ramah cocok untuk mahasiswa. Tapi dari transkrip, **titik gesekan terbesar ada di onboarding pengguna "@lid"** (nomor tersembunyi WhatsApp format baru): pengguna berulang kali diminta daftar nomor/nama, kadang nama tertangkap salah, dan bot sering membanjiri menu panjang.

**3 risiko teratas untuk kenyamanan pelanggan:**
1. **Loop registrasi @lid** — pengguna diminta daftar ulang berkali-kali → frustrasi, drop-off di pintu masuk.
2. **Menu panjang dikirim terlalu sering** — hampir tiap sapaan biasa dibalas menu 8 baris → terasa spammy & robotik.
3. **Perintah admin (`#…`) bocor ke pelanggan** + bot & manusia berbagi 1 nomor → tampak tidak profesional.

Sebagian sudah mulai tertangani (nama kini persisten di Supabase — sesi 16 Juli). Sisanya butuh perbaikan logika kecil + beberapa keputusan struktural.

---

## 2. Temuan Detail (Masalah → Bukti → Akar → Solusi)

### 🔴 A. Onboarding & Identitas @lid (gesekan terbesar)

#### A1 — Loop registrasi "format baru" berulang
- **Bukti:** Chat owner-test, ~10.18–15.16: bot mengirim *"Sistem tidak dapat mengenali nomor WA-mu… format baru… balas nomor"* setidaknya 5× dalam satu sesi. Pengguna balas nomor → *"berhasil terdaftar"* → pesan berikutnya diminta daftar lagi.
- **Akar:** JID `@lid` menyembunyikan nomor asli. Resolusi (`lidMap`/`lidResolutionMap`) hilang tiap bot restart (dulu di file lokal). Setiap pesan tanpa resolusi memicu prompt daftar ulang.
- **Solusi:**
  1. ✅ **Sudah dikerjakan sebagian:** `lid_resolution_map` & `name_map` kini disimpan di Supabase (`wa_state`) → tidak reset saat restart. **Wajib jalankan `wa_state.sql`.**
  2. Simpan hasil verifikasi @lid → nomor **secara permanen di tabel** (bukan hanya map memori), keyed by JID `@lid`, agar sekali daftar cukup selamanya.
  3. Jangan minta daftar ulang jika JID sudah pernah terverifikasi walau map memori kosong — cek DB dulu.

#### A2 — Nama tertangkap salah ("Iya" jadi nama)
- **Bukti:** Chat 0812-xxxx-2351: bot tanya *"Siapa namamu?"*, pengguna balas **"Iya"** → *"Noted! Halo **Iya**!"*.
- **Akar:** `index.js` — `isValidName` hanya cek panjang 2–50 & bukan angka. Kata jawaban biasa ("iya/ya/ok/gas/min") lolos jadi "nama".
- **Solusi:** Tambah daftar-hitam kata umum (iya, ya, oke, ok, gas, min, admin, halo, p, cari, jual, mana, woi, dll) di `isValidName`; idealnya hanya tangkap nama tepat setelah bot bertanya (flag "menunggu nama"), bukan menebak dari sembarang balasan.

#### A3 — Dua versi alur onboarding tidak konsisten
- **Bukti:** Sebagian chat pakai alur **nomor + nama + OTP 4 digit** (christi, JackMa — mulus ✅); chat lain hanya minta **nomor saja** (owner-test); ada pula yang minta **nomor + nama**.
- **Akar:** Alur berubah antar-versi, teks prompt beda-beda.
- **Solusi:** Standarkan **satu** alur onboarding + satu teks. Rekomendasi: minta nomor → OTP (paling aman anti-bajak, sudah terbukti mulus).

---

### 🟡 B. Pengenalan Maksud (Intent)

#### B1 — Menu panjang dikirim terlalu sering
- **Bukti:** Chat owner-test: "Woi", "Keren", "Mana kau", "Woii", "Mna kau" → **semua** dibalas menu 8 baris identik, beruntun. Chat Alvin: menu dikirim 4× berturut.
- **Akar:** `route.js` ~2050–2064: pesan tanpa keyword → greeting/menu (jika `greeting_enabled`) atau diam. Menu default sangat panjang & dikirim tiap trigger tanpa cooldown.
- **Solusi:**
  1. Perpendek sapaan default (1–2 baris + ajakan ketik *MENU*).
  2. Kirim **menu lengkap hanya saat diminta** (`MENU`), bukan tiap sapaan.
  3. Cooldown: jangan kirim menu/sapaan sama ke nomor yang sama dalam X menit.

#### B2 — Kata pendek "Min" routing tidak konsisten
- **Bukti:** Chat christi: "Min" → *"🔍 Hasil Pencarian: barang"* (nyasar jadi pencarian) lalu menu. Chat lain: "Min" → menu (benar).
- **Akar:** `route.js` ~2063 kini map tepat `min`→menu, tapi bila "Min" muncul dalam konteks pencarian / via AI intent, bisa jadi keyword "barang".
- **Solusi:** Pastikan cek kata-pendek (min/admin/p/hai) **sebelum** jalur AI; jika hasil pencarian kosong, jangan fallback ke keyword generik "barang".

#### B3 — Budget angka pendek salah baca (500 → Rp 500)
- **Bukti:** Chat JackMa: *"Cari Orion V2 budget 500"* → *"Budget: Rp 500"* (maksudnya 500rb). Sedangkan *"budget 2 juta"* benar (Rp 2.000.000).
- **Akar:** `gemini.js` ~245 — prompt minta "angka budget dalam rupiah" tanpa normalisasi singkatan. Angka polos kecil diambil apa adanya.
- **Solusi:** Di prompt, instruksikan: angka polos < 1.000 pada konteks budget/harga barang ditafsirkan sebagai ribuan (500 → 500.000); atau konfirmasi ke user bila ambigu.

#### B4 — Pencarian sering "tidak ketemu"
- **Bukti:** Chat owner-test: *"Cari iPhone 13 harga 4 juta ibox"* → *"nggak nemuin iPhone 13"* padahal ada listing HP. *"Cari sandal crocs putih/cream uk 38 39"* → tersimpan cuma "Sandal Crocs" (detail warna/ukuran hilang).
- **Akar:** Ekstraksi keyword menyempitkan query & pencocokan terlalu ketat (exact-ish).
- **Solusi:** Pencocokan lebih longgar (partial/fuzzy per kata), simpan detail lengkap di deskripsi "Dicari", dan tawarkan alternatif saat 0 hasil ("mau aku pasang sebagai Dicari?").

---

### 🟠 C. Duplikasi & Kebisingan

#### C1 — Pesan terkirim dobel
- **Bukti:** Chat owner-test ~15.16: *"Tagihan Belum Lunas"* dikirim **2× identik** berturut. Menu juga sering dobel.
- **Akar:** Handler/trigger tereksekusi ganda (mis. pesan masuk beruntun cepat, atau webhook + retry).
- **Solusi:** Debounce per (nomor + jenis pesan) beberapa detik; idempotensi pada pembuatan tagihan.

#### C2 — Pesan kosong terkirim
- **Bukti:** Chat Alvin: 2 pesan kosong dari bot. Chat owner-test: baris kosong.
- **Solusi:** Guard: jangan panggil `sendWa`/`sendMessage` bila teks kosong/whitespace.

#### C3 — Footer "> _Sent via fonnte.com_" bocor
- **Bukti:** Muncul di OTP, share produk, notif *Pembayaran Sukses* (chat Josafat & owner-test).
- **Akar:** Pesan-pesan itu masih lewat gateway **Fonnte** (bukan Baileys); Fonnte plan gratis menambah footer.
- **Solusi:** Pastikan `BAILEYS_API_URL` diset sehingga semua kirim (termasuk OTP) lewat Baileys; atau strip footer; atau upgrade Fonnte. Idealnya pensiunkan Fonnte kalau Baileys sudah stabil.

---

### 🔵 D. Model Bisnis & Operasional

#### D1 — Struktur biaya membingungkan penjual
- **Bukti:** Chat Josafat (iPhone): kena **Rp 48.000** untuk 1 iklan gabungan 2 HP, bingung, disuruh ulang & pecah jadi 2 listing, *"blom lagi fee nya kalo laku 😭"*. Owner akhirnya gratiskan admin & atur manual.
- **Akar:** Biaya tayang proporsional harga + fee sukses tidak dijelaskan di awal; hitungan terasa mahal untuk barang mahal.
- **Solusi:** Tampilkan **estimasi biaya + cara hitung** sebelum tagihan; sediakan opsi "1 iklan beberapa barang"; pertimbangkan cap biaya tayang.

#### D2 — Bot & manusia berbagi 1 nomor → tumpang tindih
- **Bukti:** Owner sering balas manual di tengah alur bot; perintah `#min`, `#saya`, `#random`, `#rasyid` **terlihat pelanggan** (chat 0822-xxxx-8612, Alvin, 0812-xxxx-2351). Setelah handoff ("bot diam"), bot kadang balas lagi.
- **Akar:** Nomor bot = nomor admin. Perintah berprefiks `#` dari HP (fromMe) tetap tampil sebagai pesan biasa di sisi lawan chat.
- **Solusi:**
  1. Jangka pendek: hindari ketik `#…` dari HP bisnis di chat pelanggan; pakai panel admin web.
  2. Jangka menengah: **pisahkan nomor bot & nomor admin manusia** — hilangkan seluruh kelas masalah ini.
  3. Pastikan mode handoff/pause benar-benar membungkam bot untuk pelanggan itu sampai admin selesai.

---

### ⚫ E. Keamanan & Kebersihan (historis)

#### E1 — Log debug & kredensial pernah bocor ke chat
- **Bukti:** Chat owner-test (Juni, era Railway): blok *"RAILWAY EVENT: {…}"*, *"Debug: Vercel melewatkan… WHATSAPP_ALLOWED_PHONE kosong"*, dan **token bot Telegram** ter-paste utuh.
- **Status:** Kemungkinan sisa debugging lama; pastikan tidak ada lagi `console`/debug yang dikirim ke user di produksi.
- **Solusi:** Audit path yang mengirim objek mentah/log ke WA; nyambung ke item rotasi kredensial yang masih pending.

---

## 3. Rekomendasi Prioritas

### ⚡ Quick wins (edit kecil, dampak langsung)
| # | Aksi | Temuan |
|---|------|--------|
| 1 | Jalankan `wa_state.sql` (nama & @lid persisten) | A1 |
| 2 | Blacklist kata non-nama di `isValidName` | A2 |
| 3 | Normalisasi budget angka pendek di prompt Gemini | B3 |
| 4 | Guard pesan kosong sebelum kirim | C2 |
| 5 | Perpendek sapaan; menu lengkap hanya saat `MENU` | B1 |
| 6 | Debounce anti-dobel per (nomor+jenis) | C1 |

### 🏗️ Struktural (butuh keputusan)
| # | Aksi | Temuan |
|---|------|--------|
| 7 | Pisahkan nomor bot vs admin manusia | D2 |
| 8 | Standarkan 1 alur onboarding (nomor→OTP) | A3 |
| 9 | Perjelas & sederhanakan struktur biaya | D1 |
| 10 | Pindahkan semua kirim (termasuk OTP) ke Baileys, pensiunkan Fonnte | C3 |
| 11 | Bangun logging percakapan permanen (`wa_conversations`) untuk audit berkelanjutan | — |

---

## 4. Roadmap Kenyamanan Pelanggan (usulan urutan)

1. **Minggu ini:** Quick wins #1–#6 (hilangkan gesekan onboarding & kebisingan).
2. **Berikutnya:** #11 logging percakapan → data untuk audit berkala otomatis.
3. **Keputusan bisnis:** #7 pisah nomor, #9 struktur biaya.
4. **Pembersihan:** #10 pensiun Fonnte, #8 standarkan onboarding.

> Prinsip pemandu: **sedikit bicara, tepat sasaran.** Bot terbaik untuk mahasiswa = cepat paham maksud, tidak mengulang, tidak membanjiri menu, dan tidak pernah membuat pengguna merasa "diajak ngobrol sama robot pikun".

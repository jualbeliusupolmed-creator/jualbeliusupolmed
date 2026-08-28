# Panduan Konfigurasi Meta Graph API (Instagram & Facebook)

Dokumen ini berisi panduan langkah-demi-langkah (SOP) untuk mendapatkan **Meta Access Token**, **Facebook Page ID**, dan **Instagram User ID** agar fitur Auto-Posting Jual Beli USU dapat berjalan.

## 📝 Prasyarat
1. Akun Facebook Pribadi (sebagai pengelola halaman).
2. Halaman (Page) Facebook Jual Beli USU.
3. Akun Instagram Bisnis/Kreator Jual Beli USU.
4. Akun Instagram **wajib** ditautkan ke Halaman Facebook tersebut.

---

## TAHAP 1: Menautkan Instagram ke Facebook Page
Jika belum tertaut, ikuti langkah ini:
1. Buka Facebook dan masuk ke **Halaman (Page)** Jual Beli USU.
2. Buka menu **Pengaturan Halaman** (Settings).
3. Cari menu **Akun Tertaut** (Linked Accounts) -> Pilih **Instagram**.
4. Klik **Hubungkan Akun** dan login ke akun Instagram Jual Beli USU.
5. Pastikan statusnya "Terhubung".

---

## TAHAP 2: Membuat Aplikasi di Meta Developer Portal
1. Buka [https://developers.facebook.com/](https://developers.facebook.com/) dan login menggunakan akun Facebook Pribadi Abang.
2. Klik **My Apps** (Aplikasi Saya) di pojok kanan atas, lalu klik tombol **Create App** (Buat Aplikasi).
3. Pilih opsi **Other** (Lainnya) -> klik Next.
4. Pilih **Business** (Bisnis) -> klik Next.
5. Masukkan Nama Aplikasi (misal: `Bot Jual Beli USU`) dan masukkan email kontak. Klik **Create App**.
6. Abang akan masuk ke *Dashboard* Aplikasi. Scroll ke bawah, cari kotak **Instagram Graph API** dan klik **Set Up**. Ulangi untuk **Facebook Graph API** jika tersedia.

---

## TAHAP 3: Mendapatkan FB Page ID dan IG User ID
1. Di Dashboard Meta Developer (menu kiri), klik menu **Graph API Explorer** (berada di bawah menu Tools).
2. Di sebelah kanan (kolom *Meta App*), pastikan aplikasi yang Abang buat terpilih.
3. Di bagian **User or Page**, klik dropdown dan ganti menjadi **Get Page Access Token**. Nanti akan muncul popup login FB, izinkan semuanya (centang Page & IG yang bersangkutan).
4. Setelah itu, pilih nama Halaman Facebook Jual Beli USU di dropdown tersebut.
5. Sekarang, di kolom URL API (yang ada tombol *Submit*), masukkan query ini:
   `me?fields=id,name,instagram_business_account`
6. Klik **Submit**.
7. Di kotak respons JSON di bawahnya, Abang akan mendapatkan hasil mirip seperti ini:
   ```json
   {
     "id": "123456789012345", <--- INI ADALAH FB_PAGE_ID
     "name": "Jual Beli USU",
     "instagram_business_account": {
       "id": "17841400000000000" <--- INI ADALAH IG_USER_ID
     }
   }
   ```
8. **Simpan** `FB_PAGE_ID` dan `IG_USER_ID` tersebut.

---

## TAHAP 4: Generate Token Permanen (Never Expire)
Token yang didapat dari *Graph API Explorer* biasanya hanya bertahan 1 jam. Kita butuh token permanen agar admin tidak repot mengganti token setiap hari.

1. Buka [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/).
2. Tempel (Paste) token sementara yang Abang dapat dari Graph API Explorer tadi ke kotak input, lalu klik **Debug**.
3. Scroll ke bawah dan klik tombol **Extend Access Token** (Perpanjang Access Token).
4. Meta akan memberikan token baru yang berlaku selama **60 Hari**. Salin token 60 hari tersebut.
5. **MEMBUAT TOKEN PERMANEN:**
   Buka URL ini di *browser* Abang (ganti teks di dalam kurung kurawal):
   ```text
   https://graph.facebook.com/v19.0/{FB_PAGE_ID}?fields=access_token&access_token={TOKEN_60_HARI_YANG_BARU_DISALIN}
   ```
6. Browser akan menampilkan teks JSON seperti ini:
   ```json
   {
     "access_token": "EAAI...", <--- INI ADALAH TOKEN PERMANEN (NEVER EXPIRE)
     "id": "123456789012345"
   }
   ```
7. Selamat! `EAAI...` tersebut adalah **Meta Page Access Token** yang tidak akan kedaluwarsa selama password FB Abang tidak diganti.

---

## TAHAP 5: Memasukkan Data ke Panel Admin
1. Buka Website Jual Beli USU -> Masuk ke menu **Admin**.
2. Buka tab **Pengaturan**.
3. Cari kotak **Konfigurasi Meta (Instagram & Facebook)**.
4. Masukkan **Meta Page Access Token**, **Facebook Page ID**, dan **Instagram User ID** yang sudah Abang dapatkan.
5. Klik **Simpan Konfigurasi Meta**.
6. Selesai! Silakan coba perintah `POST IG [KODE_IKLAN]` di WhatsApp untuk melakukan pengetesan.

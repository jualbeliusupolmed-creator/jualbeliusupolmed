# Gerbang Kejujuran Teks (Claim Registry)

Dokumen ini mencatat setiap janji produk yang tampil di antarmuka pengguna Kampus Kita, kode yang mewujudkannya, dan pembuktiannya.
Prinsip utama: **Jika sebuah fitur belum memiliki kode nyata dan tes yang membuktikannya, janji tersebut DILARANG ditulis di layar.**

| No | Teks Janji yang Tampil ke Pengguna | Halaman / Lokasi Teks | Berkas Kode Implementasi | Tes yang Membuktikan | Status |
|---|---|---|---|---|---|
| J1 | "Pesanmu hanya bisa dibaca oleh kamu dan lawan bicara" | `/chat` & `/chat?room=[id]` | `src/app/api/chat/room/[id]/route.js` (fungsi `ambilRoomUntuk` verifikasi sesi cookie & tolak 403) | `__tests__/chatPrivacy.test.js` | Terverifikasi |
| J2 | "Nomor WhatsApp kamu 100% aman dan dirahasiakan" | `/chat`, `ProductCard.jsx`, `/chat-wa/[id]` | `src/app/chat-wa/[id]/route.js` & `src/app/chat/page.jsx` | `__tests__/chatWaRoute.test.js` | Terverifikasi |
| J3 | "Angka penanda pesan hanya menampilkan obrolan yang belum dibaca" | `src/components/Navbar.jsx` | `src/components/Navbar.jsx` (hanya aktif saat login dan dihitung dari data riil) | `__tests__/chatBadge.test.js` | Terverifikasi |
| J4 | "Halaman obrolan privat tidak diindeks mesin pencari" | `src/app/chat/layout.jsx` | `src/app/chat/layout.jsx` (`robots: noindex, nofollow`) & `src/app/robots.js` | `src/lib/meta.test.js` | Terverifikasi |
| J5 | "Iklan AdSense tidak dimuat di ruang percakapan privat" | `src/app/layout.jsx` | `src/components/AdSenseScript.jsx` (hanya memuat skrip jika bukan rute privat) | `__tests__/adsenseFilter.test.js` | Terverifikasi |
| J6 | "Janjian COD aman di titik ramai sekitar kampus" | `src/app/chat/page.jsx` & `/chat-wa/[id]` | `src/lib/constants.js` (titik COD resmi) | `__tests__/codPoints.test.js` | Dalam Pengembangan (Fase D) |
| J7 | "Peringatan otomatis saat ada permintaan transfer uang muka / DP" | `src/app/chat/page.jsx` | `src/lib/chatSafety.js` | `__tests__/chatSafety.test.js` | Dalam Pengembangan (Fase C) |


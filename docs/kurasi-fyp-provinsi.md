# Kurasi FYP Provinsi

## Aturan

- Superadmin dapat memilih provinsi mana pun yang aktif. Admin provinsi hanya
  dapat mengelola provinsi yang tercantum pada assignment akunnya.
- Kurator memilih sampai 12 listing aktif dari kampus yang dipetakan ke
  provinsi tersebut dan dapat mengatur urutan tampilnya.
- Pilihan disimpan pada baris `settings` khusus `fyp_province_<province_id>`;
  perubahan dicatat ke `admin_audit_events`. Tidak ada migrasi skema baru.
- Beranda hanya meminta pilihan editorial saat pengguna memilih jangkauan
  provinsi. Listing unggulan ditempatkan lebih dulu, lalu listing wilayah
  lainnya mengikuti urutan umum pengguna.
- Hanya listing aktif yang dikembalikan. Jika listing dinonaktifkan atau
  dihapus, ia berhenti tampil meski ID lama masih tersimpan pada daftar.
- Open PO mengikuti batas FYP yang sama. Jika wilayah tidak memiliki batch
  yang cocok, hasilnya kosong; tidak ada fallback ke batch seluruh wilayah.

## Operasional

Menu **Admin → Kurasi FYP provinsi** tersedia untuk superadmin dan admin
provinsi. Pastikan katalog universitas memiliki `province_id` yang benar agar
listing tercakup. Periksa pilihan secara berkala dan hapus unggulan yang sudah
tidak sesuai. Pilihan FYP tidak mengubah status moderasi listing dan tidak
mempublikasikan konten ke Instagram atau WhatsApp.

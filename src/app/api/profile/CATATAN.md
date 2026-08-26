# /api/profile/anonymous-name — dihapus 26 Agustus 2026

Rute ini menyunting satu kolom profil (`anonymous_name`) dengan aturannya
sendiri: pemotongan sendiri, penyensoran sendiri, upsert sendiri.

Ia dihapus bukan karena rusak, melainkan karena tidak ada lagi yang
memanggilnya. Nol pemakai di `src/`, nol di `bot-wa/`, nol di `scripts/`.
Formulirnya di dashboard sudah lama dicabut — yang tertinggal cuma
`saveAnonymousName()` yang tidak pernah dipanggil dari mana pun, beserta dua
state React yang menemaninya. Ketiganya ikut dibuang.

`anonymous_name` sekarang bagian dari `FIELD_DASAR` di `lib/profil.js` dan
disunting lewat Profil Satu Pintu seperti nama dan bio — dengan pemotongan dan
penyensoran yang sama dengan semua teks profil lain, bukan versinya sendiri.

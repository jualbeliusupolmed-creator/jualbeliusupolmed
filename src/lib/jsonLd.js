// Satu tempat untuk mengubah objek JSON-LD menjadi isi <script>.
//
// Pola yang dipakai di seluruh halaman sebelum ini benar bentuknya:
//
//   JSON.stringify(data).replace(/</g, "\u003c")
//
// tetapi di tiga berkas — /jasa, /faq, dan layout.jsx — tanda garis miringnya
// cuma satu: `.replace(/</g, "\u003c")`. Di JavaScript "\u003c" BUKAN teks
// enam karakter; ia sudah menjadi karakter "<" itu sendiri. Jadi barisnya
// mengganti "<" dengan "<" — terlihat seperti penjagaan, sebenarnya tidak
// mengerjakan apa pun.
//
// Yang menjadikannya penting: JSON-LD di /jasa memuat judul iklan, dan judul
// iklan diketik penjual. Judul berisi `</script><script>…` menutup blok itu
// lebih awal, dan sisanya dieksekusi peramban SETIAP pengunjung halaman jasa.
// Di /faq dan layout isinya kebetulan statis, jadi di sana ia bom yang belum
// dipasang sumbunya — sampai ada yang menyisipkan data dinamis ke sana.
//
// Karena bedanya cuma satu garis miring dan matanya mudah melewatkan, jalannya
// dijadikan satu: halaman memanggil skripJsonLd(), bukan menyusun rantai
// replace sendiri-sendiri.
export function skripJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    // U+2028/U+2029 sah di dalam string JSON tapi memutus baris di JavaScript.
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

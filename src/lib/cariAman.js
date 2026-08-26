// Sanitasi kata kunci sebelum masuk ke filter PostgREST.
//
// `.or("title.ilike.%X%,description.ilike.%X%")` bukan query berparameter — ia
// string yang diurai PostgREST di sisi server. Karakter `,` memisahkan syarat,
// `(` `)` mengelompokkannya, dan `%` `_` adalah wildcard LIKE. Jadi kata kunci
// yang dikirim mentah bukan sekadar dicari; ia ikut menulis ulang filternya.
// Ketikan seperti `a,status.eq.draft` mengubah pertanyaan yang diajukan ke
// basis data.
//
// Pola ini sudah dipakai /api/wanted sejak lama, tapi hanya di sana — enam
// tempat lain yang menerima ketikan orang (pencarian situs dan lima jalur CARI
// di bot WA) masih menyisipkannya apa adanya. Aturannya sekarang tinggal satu
// dan dipanggil dari semua tempat itu.
//
// Batas 100 karakter bukan soal keamanan, melainkan menjaga panjang URL filter
// tetap masuk akal.
export function cariAman(q, { maks = 100 } = {}) {
  return String(q || "").replace(/[%_,()]/g, " ").trim().slice(0, maks);
}

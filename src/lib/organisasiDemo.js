// Enam organisasi ini BUKAN pengguna: tak satu pun pernah mendaftar. Mereka ada
// supaya direktori tidak tampil kosong di hari-hari awal — pajangan etalase.
//
// Sampai hari ini keenamnya membawa `ukm_verified: true` dan kartu direktori
// menempelkan lencana " Resmi" pada SEMUA kartu tanpa membaca kolom itu sama
// sekali. Jadi situs menyatakan enam organisasi nyata sudah bergabung dan
// terverifikasi — padahal tidak ada yang memverifikasi apa pun, dan mereka
// sendiri tidak tahu namanya dipajang. Dua UKM yang benar-benar mendaftar
// berdiri di rak yang sama, tak terbedakan.
//
// Sekarang keduanya dipisah: contoh ditandai `is_demo` dan kehilangan lencana,
// lencana " Resmi" hanya untuk yang `ukm_verified === true` (lewat kode
// undangan atau persetujuan admin).
//
// Daftar ini dulu disalin utuh di dua berkas — /api/organisasi dan halaman
// /organisasi — dan sudah sempat berbeda diam-diam. Satu sumber saja sekarang.
export const ORGANISASI_CONTOH = [
  {
    id: "org-pema-usu",
    ukm_name: "PEMA USU (Pemerintahan Mahasiswa)",
    ukm_category: "bem_hima",
    ukm_category_label: "BEM & HIMA",
    campus: "USU",
    faculty: "Universitas",
    ukm_instagram: "pema.usu",
    photo_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=300&auto=format&fit=crop&q=80",
    bio: "Lembaga eksekutif tertinggi mahasiswa Universitas Sumatera Utara. Mewadahi aspirasi, advokasi, dan kolaborasi mahasiswa USU.",
    ukm_verified: false,
    is_demo: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "org-bem-polmed",
    ukm_name: "BEM POLMED",
    ukm_category: "bem_hima",
    ukm_category_label: "BEM & HIMA",
    campus: "POLMED",
    faculty: "Politeknik",
    ukm_instagram: "bempolmed_official",
    photo_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=300&auto=format&fit=crop&q=80",
    bio: "Badan Eksekutif Mahasiswa Politeknik Negeri Medan. Bergerak untuk kemajuan dan kreativitas mahasiswa Polmed.",
    ukm_verified: false,
    is_demo: true,
    created_at: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "org-robotika-usu",
    ukm_name: "UKM Robotika USU",
    ukm_category: "riset_teknologi",
    ukm_category_label: "Riset & Teknologi",
    campus: "USU",
    faculty: "Fasilkom-TI / Teknik",
    ukm_instagram: "robotika_usu",
    photo_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&auto=format&fit=crop&q=80",
    bio: "Unit Kegiatan Mahasiswa bidang riset otomasi, IoT, dan kontes robot nasional. Terbuka untuk seluruh mahasiswa USU.",
    ukm_verified: false,
    is_demo: true,
    created_at: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "org-teater-o",
    ukm_name: "Teater O USU",
    ukm_category: "seni_budaya",
    ukm_category_label: "Seni & Budaya",
    campus: "USU",
    faculty: "FIB / Universitas",
    ukm_instagram: "teatero_usu",
    photo_url: "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=300&auto=format&fit=crop&q=80",
    bio: "Komunitas dan UKM seni peran, sastra, teater, dan pementasan seni budaya mahasiswa USU Medan.",
    ukm_verified: false,
    is_demo: true,
    created_at: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "org-pers-suara-usu",
    ukm_name: "Pers Mahasiswa Suara USU",
    ukm_category: "media_pers",
    ukm_category_label: "Pers & Media",
    campus: "USU",
    faculty: "Universitas",
    ukm_instagram: "suarausu",
    photo_url: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&auto=format&fit=crop&q=80",
    bio: "Lembaga Pers Mahasiswa independen Universitas Sumatera Utara. Menyajikan berita, liputan investigasi, dan opini kampus.",
    ukm_verified: false,
    is_demo: true,
    created_at: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "org-futsal-polmed",
    ukm_name: "UKM Olahraga & Futsal Polmed",
    ukm_category: "olahraga",
    ukm_category_label: "Olahraga",
    campus: "POLMED",
    faculty: "Politeknik",
    ukm_instagram: "futsal_polmed",
    photo_url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
    bio: "Pusat pembinaan bakat olahraga, futsal, basket, dan kejuaraan pekan olahraga mahasiswa Polmed Medan.",
    ukm_verified: false,
    is_demo: true,
    created_at: "2026-01-06T00:00:00.000Z",
  },
];

// seller_profiles -> bentuk kartu direktori.
// `ukm_verified !== false` dulu dipakai di sini; artinya profil yang kolomnya
// masih NULL — mendaftar tanpa kode undangan — ikut terhitung terverifikasi.
// Lencana harus butuh bukti, bukan sekadar ketiadaan bantahan.
export function bentukOrganisasi(org) {
  return {
    id: org.wa,
    ukm_name: org.ukm_name || org.name,
    ukm_category: org.ukm_category || "bem_hima",
    campus: org.campus || "USU",
    faculty: org.faculty || "Umum",
    ukm_instagram: org.ukm_instagram || "",
    photo_url: org.avatar_url || "",
    bio: org.bio || "",
    ukm_verified: org.ukm_verified === true,
    is_demo: false,
    created_at: org.created_at,
  };
}

// Yang asli selalu didahulukan: kalau UKM yang namanya sudah dipajang sebagai
// contoh akhirnya mendaftar, barisnya sendiri yang menang.
export function gabungDenganContoh(orgList = []) {
  const peta = new Map();
  [...orgList, ...ORGANISASI_CONTOH].forEach((o) => {
    const kunci = (o.ukm_name || "").toLowerCase();
    if (!peta.has(kunci)) peta.set(kunci, o);
  });
  return Array.from(peta.values());
}

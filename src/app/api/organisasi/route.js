import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const DEMO_ORGANISASI = [
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
    ukm_verified: true,
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
    ukm_verified: true,
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
    ukm_verified: true,
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
    ukm_verified: true,
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
    ukm_verified: true,
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
    ukm_verified: true,
    created_at: "2026-01-06T00:00:00.000Z",
  },
];

// GET /api/organisasi — Fetch direktori organisasi & UKM terverifikasi
export async function GET(req) {
  try {
    const rl = rateLimit(getClientIp(req), { limit: 60, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const campus = searchParams.get("campus");
    const q = searchParams.get("q")?.toLowerCase();

    const supa = getAdminClient();

    // Query seller_profiles yang memiliki account_type 'ukm' atau is_ukm true
    const { data: dbOrgs, error } = await supa
      .from("seller_profiles")
      .select("wa, name, bio, avatar_url, photo_url, campus, faculty, ukm_name, ukm_category, ukm_instagram, ukm_verified, created_at")
      .or("account_type.eq.ukm,ukm_verified.eq.true")
      .order("created_at", { ascending: false });

    let orgList = [];

    if (!error && dbOrgs && dbOrgs.length > 0) {
      orgList = dbOrgs.map((org) => ({
        id: org.wa,
        ukm_name: org.ukm_name || org.name,
        ukm_category: org.ukm_category || "bem_hima",
        campus: org.campus || "USU",
        faculty: org.faculty || "Umum",
        ukm_instagram: org.ukm_instagram || "",
        photo_url: org.photo_url || org.avatar_url || "",
        bio: org.bio || "",
        ukm_verified: org.ukm_verified !== false,
        created_at: org.created_at,
      }));
    }

    // Gabungkan dengan demo data agar direktori selalu kaya
    const combined = [...orgList, ...DEMO_ORGANISASI];
    const uniqueMap = new Map();
    combined.forEach((o) => {
      const key = (o.ukm_name || "").toLowerCase();
      if (!uniqueMap.has(key)) uniqueMap.set(key, o);
    });

    let results = Array.from(uniqueMap.values());

    // Filter Kategori
    if (category && category !== "all") {
      results = results.filter((o) => o.ukm_category === category);
    }

    // Filter Kampus
    if (campus && campus !== "Semua") {
      results = results.filter((o) => o.campus === campus);
    }

    // Filter Pencarian
    if (q) {
      results = results.filter(
        (o) =>
          o.ukm_name?.toLowerCase().includes(q) ||
          o.bio?.toLowerCase().includes(q) ||
          o.faculty?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      organisasi: results,
      total: results.length,
    });
  } catch (err) {
    console.error("GET /api/organisasi error:", err);
    return NextResponse.json({ error: "Gagal memuat direktori organisasi." }, { status: 500 });
  }
}

// PATCH /api/organisasi — Update profil & susunan struktur BPH organisasi
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { wa, ukm_bio, ukm_structure, ukm_instagram } = body;

    if (!wa) {
      return NextResponse.json({ error: "Identitas organisasi (wa) diperlukan." }, { status: 400 });
    }

    const supa = getAdminClient();
    const updates = {};
    if (typeof ukm_bio === "string") {
      updates.ukm_bio = ukm_bio;
      updates.bio = ukm_bio;
    }
    if (typeof ukm_structure === "string" || typeof ukm_structure === "object") {
      updates.ukm_structure = typeof ukm_structure === "string" ? ukm_structure : JSON.stringify(ukm_structure);
    }
    if (typeof ukm_instagram === "string") {
      updates.ukm_instagram = ukm_instagram;
    }

    if (Object.keys(updates).length > 0) {
      try {
        await supa.from("seller_profiles").update(updates).eq("wa", wa);
      } catch (err) {
        // Fallback jika kolom tertentu belum ada di DB
        if (updates.bio) {
          await supa.from("seller_profiles").update({ bio: updates.bio }).eq("wa", wa);
        }
      }
    }

    return NextResponse.json({ success: true, message: "Profil organisasi berhasil diperbarui." });
  } catch (err) {
    console.error("PATCH /api/organisasi error:", err);
    return NextResponse.json({ error: "Gagal menyimpan perubahan organisasi." }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { formatWa } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Sample initial data if table is fresh
const SAMPLE_OPREC = [
  {
    id: "demo-oprec-1",
    ukm_wa: "62895429126232",
    ukm_name: "PEMA USU (Pemerintahan Mahasiswa)",
    campus: "USU",
    faculty: "Universitas",
    title: "Open Recruitment Panitia Konser Suara Mahasiswa USU 2026",
    description: "Bergabunglah menjadi bagian dari perhelatan musik dan seni terbesar mahasiswa USU. Terbuka untuk seluruh mahasiswa aktif angkatan 2023, 2024, dan 2025.",
    divisions: ["Acara & Talent", "Humas & Sponsorship", "Kreatif & Desain", "Perlengkapan & Sound", "Konsumsi", "Dokumentasi & Media"],
    requirements: "1. Mahasiswa aktif USU (S1/D3)\n2. Berkomitmen dan bertanggung jawab\n3. Memiliki loyalitas untuk menyukseskan acara kampus",
    custom_fields: [
      { id: "ktm_foto", label: "Upload Foto KTM / Bukti Mahasiswa Aktif", type: "image", required: true },
      { id: "ig_pribadi", label: "Username Instagram Pribadi", type: "text", placeholder: "@username", required: true },
      { id: "alasan_detail", label: "Ide & Kontribusi yang ingin kamu bawa untuk divisi pilihan 1", type: "textarea", required: false }
    ],
    deadline: new Date(Date.now() + 14 * 864e5).toISOString(),
    wa_group_link: "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA",
    banner_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
    status: "active",
    created_at: new Date().toISOString(),
    submissions_count: 12,
  },
  {
    id: "demo-oprec-2",
    ukm_wa: "62895429126232",
    ukm_name: "UKM Robotika USU",
    campus: "USU",
    faculty: "Fasilkom-TI / Teknik",
    title: "Penerimaan Anggota Baru & Tim Kontes Robot Nasional (KRI)",
    description: "Ingin belajar pemrograman mikrokontroler, IoT, dan mekanik robot? Daftarkan dirimu ke divisi software, hardware, atau mekanik.",
    divisions: ["Divisi Software & AI", "Divisi Hardware & IoT", "Divisi Mekanik & 3D Design", "Divisi Manajemen & Humas"],
    requirements: "1. Mahasiswa aktif USU semua jurusan (terbuka untuk pemula)\n2. Memiliki kemauan belajar tinggi",
    custom_fields: [
      { id: "upload_ktm", label: "Foto KTM / Kartu Tanda Mahasiswa", type: "image", required: true },
      { id: "link_github", label: "Link Portofolio / GitHub / Project (Opsional)", type: "url", required: false }
    ],
    deadline: new Date(Date.now() + 20 * 864e5).toISOString(),
    wa_group_link: "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA",
    banner_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80",
    status: "active",
    created_at: new Date().toISOString(),
    submissions_count: 8,
  },
];

// GET /api/oprec — Fetch daftar formulir Oprec aktif
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const campus = searchParams.get("campus");
    const ukm_wa = searchParams.get("ukm_wa");
    const status = searchParams.get("status") || "active";

    const supa = getAdminClient();

    let query = supa
      .from("oprec_events")
      .select("*")
      .order("created_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);
    if (campus && campus !== "Semua") query = query.eq("campus", campus);
    if (ukm_wa) query = query.eq("ukm_wa", formatWa(ukm_wa) || ukm_wa);

    const { data, error } = await query;

    if (error) {
      // Jika tabel belum dimigrasikan, gunakan fallback sample data
      console.warn("oprec_events fetch error, using fallback data:", error.message);
      let fallback = SAMPLE_OPREC;
      if (campus && campus !== "Semua") fallback = fallback.filter((o) => o.campus === campus);
      return NextResponse.json({ oprecs: fallback, total: fallback.length });
    }

    const oprecList = (data && data.length > 0) ? data : SAMPLE_OPREC;

    return NextResponse.json({
      oprecs: oprecList,
      total: oprecList.length,
    });
  } catch (err) {
    console.error("GET /api/oprec error:", err);
    return NextResponse.json({ error: "Gagal memuat data Oprec." }, { status: 500 });
  }
}

// POST /api/oprec — Buat formulir Oprec baru (Khusus Akun Organisasi / PIC Terdaftar)
export async function POST(req) {
  try {
    const rl = rateLimit(`create_oprec:${getClientIp(req)}`, { limit: 15, windowMs: 600_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak request. Tunggu sebentar." }, { status: 429 });
    }

    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Silakan login dengan akun Organisasi / UKM terlebih dahulu." }, { status: 401 });
    }

    const supa = getAdminClient();

    // Verifikasi apakah profil ini adalah Akun Organisasi (UKM / BEM / HIMA)
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("name, ukm_name, account_type, ukm_verified, campus, faculty")
      .eq("wa", wa)
      .maybeSingle();

    const isUkm = profile?.account_type === "ukm" || profile?.ukm_verified || Boolean(profile?.ukm_name);
    if (!isUkm) {
      return NextResponse.json(
        {
          error: "Pembuatan formulir Oprec hanya dapat dilakukan oleh akun resmi Organisasi / UKM. Silakan daftarkan akun organisasimu terlebih dahulu.",
          needsUkmRegister: true,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      divisions,
      requirements,
      custom_fields, // Inputan kustom tambahan (tulisan / gambar / dokumen)
      deadline,
      wa_group_link,
      banner_url,
      campus,
      faculty,
    } = body;

    if (!title || title.trim().length < 5) {
      return NextResponse.json({ error: "Judul Oprec minimal 5 karakter." }, { status: 400 });
    }

    if (!deadline) {
      return NextResponse.json({ error: "Batas waktu pendaftaran (deadline) wajib diisi." }, { status: 400 });
    }

    const ukmName = profile?.ukm_name || profile?.name || "Organisasi Mahasiswa";
    const ukmCampus = campus || profile?.campus || "USU";
    const ukmFaculty = faculty || profile?.faculty || "Universitas";

    const insertPayload = {
      ukm_wa: wa,
      ukm_name: ukmName,
      campus: ukmCampus,
      faculty: ukmFaculty,
      title: title.trim(),
      description: description ? description.trim() : "",
      divisions: Array.isArray(divisions) && divisions.length > 0 ? divisions : ["Divisi 1", "Divisi 2"],
      requirements: requirements ? requirements.trim() : "",
      custom_fields: Array.isArray(custom_fields) ? custom_fields : [],
      deadline: new Date(deadline).toISOString(),
      wa_group_link: wa_group_link ? wa_group_link.trim() : null,
      banner_url: banner_url || null,
      status: "active",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supa
      .from("oprec_events")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Insert oprec error:", error.message);
      // Fallback response if custom_fields column isn't created in DB yet
      if (error.message.includes("custom_fields")) {
        delete insertPayload.custom_fields;
        const { data: retryData, error: retryErr } = await supa
          .from("oprec_events")
          .insert(insertPayload)
          .select()
          .single();
        if (!retryErr) return NextResponse.json({ success: true, oprec: retryData });
      }
      return NextResponse.json({ error: "Gagal menyimpan formulir Oprec: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, oprec: data });
  } catch (err) {
    console.error("POST /api/oprec error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

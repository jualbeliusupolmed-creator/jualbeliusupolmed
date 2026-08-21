import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sendWa, nomorAdmin } from "@/lib/fonnte";
import {
  STATUS_ARTIKEL,
  berbadge,
  statusSetelahKirim,
  slugArtikel,
  ringkasOtomatis,
  periksaArtikel,
  urlArtikel,
} from "@/lib/blogPenulis";

export const dynamic = "force-dynamic";

const KOLOM = "id, slug, title, excerpt, keywords, image_url, content_markdown, status, reject_note, created_at, updated_at, submitted_at, reviewed_at";

/** Profil penulis yang sedang masuk, atau null. */
async function penulisSekarang(supa) {
  const wa = getSellerSession();
  if (!wa) return null;
  const { data } = await supa
    .from("seller_profiles")
    .select("wa, name, blog_badge")
    .eq("wa", wa)
    .maybeSingle();
  // Nomor yang punya sesi tapi belum punya baris profil tetap boleh menulis;
  // barisnya dibuat saat artikel pertama disimpan.
  return data || { wa, name: null, blog_badge: false };
}

// GET /api/blog/penulis — daftar artikel milik penulis yang sedang masuk.
export async function GET() {
  const supa = getAdminClient();
  const penulis = await penulisSekarang(supa);
  if (!penulis) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const { data, error } = await supa
    .from("blogs")
    .select(KOLOM)
    .eq("author_wa", penulis.wa)
    .order("created_at", { ascending: false });

  if (error) {
    const belumMigrasi = /author_wa|column .* does not exist|schema cache/i.test(error.message || "");
    return NextResponse.json({
      error: belumMigrasi
        ? "Fitur tulis blog belum aktif di database — jalankan migrasi BAGIAN 29 dulu."
        : error.message,
    }, { status: 500 });
  }

  return NextResponse.json({
    berbadge: berbadge(penulis),
    nama: penulis.name || null,
    artikel: (data || []).map((a) => ({ ...a, url: a.status === "published" ? urlArtikel(a.slug) : null })),
  });
}

/*
 * POST /api/blog/penulis — simpan draf atau kirim untuk ditinjau.
 *
 * Badan: { id?, title, content_markdown, excerpt?, keywords?, image_url?, aksi }
 *   aksi "simpan" → draf, tidak ke mana-mana
 *   aksi "kirim"  → berbadge: langsung terbit; tanpa badge: masuk antrean admin
 *
 * Yang TIDAK diterima dari badan permintaan: `status` dan `author_wa`.
 * Keduanya dihitung di server dari sesi dan profil penulisnya. Kalau status
 * boleh dikirim klien, "menunggu persetujuan" cuma jadi saran.
 */
export async function POST(req) {
  const rl = rateLimit(`blog_tulis:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu cepat. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const supa = getAdminClient();
  const penulis = await penulisSekarang(supa);
  if (!penulis) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak terbaca" }, { status: 400 });
  }

  const kirim = body.aksi === "kirim";
  const galatIsi = periksaArtikel(body);
  // Draf boleh setengah jadi; yang dikirim ke admin tidak boleh.
  if (kirim && galatIsi) return NextResponse.json({ error: galatIsi }, { status: 400 });
  if (!kirim && !String(body.title || "").trim()) {
    return NextResponse.json({ error: "Draf pun butuh judul." }, { status: 400 });
  }

  const isi = {
    title: String(body.title || "").trim().slice(0, 120),
    content_markdown: String(body.content_markdown || "").slice(0, 20000),
    excerpt: String(body.excerpt || "").trim().slice(0, 220) || ringkasOtomatis(body.content_markdown),
    keywords: String(body.keywords || "").trim().slice(0, 200) || null,
    image_url: String(body.image_url || "").trim().slice(0, 500) || null,
    author: penulis.name || "Penjual",
    author_wa: penulis.wa,
    updated_at: new Date().toISOString(),
  };

  let lama = null;
  if (body.id) {
    const { data } = await supa.from("blogs").select("id, author_wa, status, slug").eq("id", body.id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
    // Artikel admin (author_wa NULL) dan artikel penjual lain tidak bisa
    // disunting dari sini. Pemeriksaannya di server, bukan dengan
    // menyembunyikan tombolnya.
    if (data.author_wa !== penulis.wa) {
      return NextResponse.json({ error: "Artikel ini bukan milikmu" }, { status: 403 });
    }
    lama = data;
  }

  // Status dihitung, tidak pernah diterima.
  //
  // Penulis tanpa badge yang menyunting artikel yang SUDAH terbit membuatnya
  // kembali ke antrean, dan artikelnya turun dari /blog sampai disetujui lagi.
  // Itu memang arti "setiap tulisan minta konfirmasi admin" — dan formulirnya
  // memperingatkan sebelum tombolnya ditekan, supaya tidak ada yang kaget
  // tulisannya menghilang setelah memperbaiki satu salah ketik.
  let status;
  if (kirim) {
    status = statusSetelahKirim(penulis);
  } else if (lama?.status === "published") {
    status = berbadge(penulis) ? "published" : "menunggu";
  } else {
    status = "draft";
  }

  const sekarang = new Date().toISOString();
  const simpanan = {
    ...isi,
    status,
    ...(status === "menunggu" && { submitted_at: sekarang, reject_note: null }),
    ...(status === "published" && { reviewed_at: sekarang, reject_note: null }),
  };

  let hasil;
  if (lama) {
    // Slug TIDAK dihitung ulang: alamat yang sudah dibagikan orang tidak boleh
    // berubah di belakang mereka.
    hasil = await supa.from("blogs").update(simpanan).eq("id", lama.id).select("id, slug, status").single();
  } else {
    hasil = await supa
      .from("blogs")
      .insert({ ...simpanan, slug: slugArtikel(isi.title), created_at: sekarang })
      .select("id, slug, status")
      .single();
  }

  if (hasil.error) {
    const belumMigrasi = /author_wa|blog_badge|column .* does not exist|schema cache/i.test(hasil.error.message || "");
    return NextResponse.json({
      error: belumMigrasi
        ? "Fitur tulis blog belum aktif di database — jalankan migrasi BAGIAN 29 dulu."
        : hasil.error.message,
    }, { status: 500 });
  }

  // Antrean moderasi tidak berguna kalau tidak ada yang tahu isinya bertambah.
  if (status === "menunggu") {
    const admin = nomorAdmin();
    const dasar = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
    if (admin) {
      sendWa(
        admin,
        `📝 *Artikel menunggu review*\n\n` +
          `*${isi.title}*\n` +
          `Penulis: ${isi.author} (${penulis.wa})\n\n` +
          `Tinjau di panel:\n${dasar}/admin/blogs`,
        null,
        null,
        { jenis: "blog_menunggu" }
      ).catch(() => {});
    }
  }

  return NextResponse.json({
    ok: true,
    id: hasil.data.id,
    slug: hasil.data.slug,
    status,
    pesan: STATUS_ARTIKEL[status]?.jelas || "Tersimpan.",
    url: status === "published" ? urlArtikel(hasil.data.slug) : null,
  });
}

// DELETE /api/blog/penulis?id=… — hapus artikel sendiri.
export async function DELETE(req) {
  const supa = getAdminClient();
  const penulis = await penulisSekarang(supa);
  if (!penulis) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  const { data } = await supa.from("blogs").select("id, author_wa").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
  if (data.author_wa !== penulis.wa) {
    return NextResponse.json({ error: "Artikel ini bukan milikmu" }, { status: 403 });
  }

  const { error } = await supa.from("blogs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

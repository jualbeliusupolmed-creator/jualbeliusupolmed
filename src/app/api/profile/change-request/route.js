import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { sendWa } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// GET /api/profile/change-request?seller_wa=628xxx
// Ambil semua request perubahan profil milik penjual
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("seller_wa");
  const sellerWa = formatWa(raw);
  if (!sellerWa) return NextResponse.json({ error: "seller_wa wajib" }, { status: 400 });

  const supa = getAdminClient();
  const { data, error } = await supa
    .from("profile_change_requests")
    .select("id, field, current_value, requested_value, status, requested_via, requested_at, reviewed_at, review_note")
    .eq("seller_wa", sellerWa)
    .order("requested_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}

// POST /api/profile/change-request
// Penjual mengajukan permintaan ubah nama/bio
export async function POST(req) {
  try {
    const body = await req.json();
    const sellerWa = formatWa(body.seller_wa);
    const field = body.field; // 'name' atau 'bio'
    const requestedValue = String(body.requested_value || "").trim();

    if (!sellerWa) return NextResponse.json({ error: "seller_wa wajib" }, { status: 400 });
    if (!["name", "bio"].includes(field)) return NextResponse.json({ error: "field harus 'name' atau 'bio'" }, { status: 400 });
    if (!requestedValue) return NextResponse.json({ error: "Nilai baru wajib diisi" }, { status: 400 });
    if (field === "name" && requestedValue.length < 2) return NextResponse.json({ error: "Nama minimal 2 karakter" }, { status: 400 });
    if (field === "name" && requestedValue.length > 50) return NextResponse.json({ error: "Nama maksimal 50 karakter" }, { status: 400 });
    if (field === "bio" && requestedValue.length > 200) return NextResponse.json({ error: "Bio maksimal 200 karakter" }, { status: 400 });

    const supa = getAdminClient();

    // Cek ada pending request untuk field yang sama, cegah spam
    const { data: existing } = await supa
      .from("profile_change_requests")
      .select("id")
      .eq("seller_wa", sellerWa)
      .eq("field", field)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Anda sudah memiliki permintaan yang sedang menunggu persetujuan admin" }, { status: 400 });
    }

    // Ambil nilai saat ini dari profil
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("name, bio")
      .eq("wa", sellerWa)
      .maybeSingle();

    const currentValue = profile?.[field] ?? null;

    // Simpan request
    const { data: inserted, error: insErr } = await supa
      .from("profile_change_requests")
      .insert({
        seller_wa: sellerWa,
        field,
        current_value: currentValue,
        requested_value: requestedValue,
        status: "pending",
        requested_via: "web",
      })
      .select()
      .single();

    if (insErr) throw new Error(insErr.message);

    // Notifikasi admin via WA
    const adminWa = process.env.ADMIN_WA || process.env.SUPER_ADMIN_WA;
    if (adminWa) {
      const fieldLabel = field === "name" ? "Nama" : "Bio";
      const msg =
        `📝 *Permintaan Ubah ${fieldLabel} Profil*\n\n` +
        `Penjual: ${profile?.name || "-"}\n` +
        `No. WA: ${sellerWa}\n\n` +
        `Nilai saat ini: _${currentValue || "(kosong)"}_ \n` +
        `Nilai baru: *${requestedValue}*\n\n` +
        `Balas dengan:\n` +
        `✅ *SETUJUI NAMA ${sellerWa}* → setujui\n` +
        `❌ *TOLAK NAMA ${sellerWa}* → tolak\n\n` +
        `Atau kelola di panel admin (/admin/profil_request)`;
      sendWa(adminWa.split(",")[0].trim(), msg).catch(() => {});
    }

    return NextResponse.json({ ok: true, request: inserted });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// GET /api/distributor/invite/[token]  → info undangan
export async function GET(req, { params }) {
  const { token } = params;
  const supa = getAdminClient();
  const { data: invite } = await supa
    .from("distributor_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Undangan sudah digunakan atau dicabut", status: invite.status }, { status: 410 });

  // Cek expired (7 hari)
  const created = new Date(invite.created_at);
  if (Date.now() - created.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Undangan sudah kadaluarsa (>7 hari)" }, { status: 410 });
  }

  // Ambil profil penjual kalau ada
  const { data: profile } = await supa
    .from("seller_profiles")
    .select("name")
    .eq("wa", invite.wa)
    .maybeSingle();

  return NextResponse.json({ invite, name: profile?.name || null });
}

// POST /api/distributor/invite/[token]  → konfirmasi bergabung
export async function POST(req, { params }) {
  const { token } = params;
  const supa = getAdminClient();

  const { data: invite } = await supa
    .from("distributor_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Undangan sudah digunakan" }, { status: 410 });

  const created = new Date(invite.created_at);
  if (Date.now() - created.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Undangan sudah kadaluarsa" }, { status: 410 });
  }

  // Aktifkan badge distributor
  await supa.from("seller_profiles").upsert(
    { wa: invite.wa, distributor: true },
    { onConflict: "wa" }
  );

  // Tandai invite as used
  await supa.from("distributor_invites").update({
    status: "used",
    used_at: new Date().toISOString(),
  }).eq("token", token);

  // Kirim konfirmasi WA
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  await sendWa(
    invite.wa,
    `🎊 *Selamat! Anda Resmi Menjadi Distributor!*\n\n` +
    `Badge *DISTRIBUTOR* sudah aktif di profil Anda.\n\n` +
    `Mulai sekarang:\n` +
    `✅ Pasang iklan *GRATIS* tanpa biaya\n` +
    `✅ Setiap iklan otomatis tampilkan info *Fee Bagi Hasil*\n` +
    `✅ Postingan Anda akan dirangkum & dikirim setiap hari jam 13.00\n\n` +
    `👉 Mulai posting: ${baseUrl}/pasang-iklan`
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}

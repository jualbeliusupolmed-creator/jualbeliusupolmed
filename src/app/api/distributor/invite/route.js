import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { sendWa } from "@/lib/fonnte";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateToken(wa) {
  return crypto
    .createHash("sha256")
    .update(`${wa}-${Date.now()}-${Math.random()}`)
    .digest("hex")
    .slice(0, 32);
}

// POST /api/distributor/invite  { wa }  → buat link undangan
export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { wa } = await req.json();
  const normalizedWa = formatWa(wa);
  if (!normalizedWa) return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });

  const supa = getAdminClient();
  const token = generateToken(normalizedWa);
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const link = `${baseUrl}/distributor/bergabung/${token}`;

  await supa.from("distributor_invites").insert({
    token,
    wa: normalizedWa,
    created_by: "admin",
  });

  // Kirim link via WA
  const msg =
    `🎉 *Undangan Bergabung sebagai Distributor*\n\n` +
    `Halo! Anda diundang bergabung sebagai *Distributor Resmi* di Jual Beli USU Polmed.\n\n` +
    `Sebagai Distributor, Anda mendapatkan:\n` +
    `✅ Badge khusus *DISTRIBUTOR* di profil\n` +
    `✅ Posting iklan *GRATIS* tanpa biaya iklan\n` +
    `✅ Info *Fee Bagi Hasil* otomatis di setiap iklan\n\n` +
    `Klik link berikut untuk konfirmasi bergabung:\n` +
    `👉 ${link}\n\n` +
    `_Link berlaku 7 hari. Jangan share ke orang lain._`;

  await sendWa(normalizedWa, msg).catch(() => {});

  return NextResponse.json({ ok: true, link, token });
}

// GET /api/distributor/invite?wa=...  → daftar invite untuk WA tertentu
export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const wa = formatWa(req.nextUrl.searchParams.get("wa") || "");
  const supa = getAdminClient();
  const query = supa.from("distributor_invites").select("*").order("created_at", { ascending: false });
  if (wa) query.eq("wa", wa);
  const { data } = await query;
  return NextResponse.json({ invites: data || [] });
}

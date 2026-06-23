import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST — jadwalkan broadcast baru
export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { message, imageUrl, scheduledAt, targetType = "all" } = await req.json();
    if (!message) return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    if (!scheduledAt) return NextResponse.json({ error: "Waktu jadwal diperlukan" }, { status: 400 });

    const scheduled = new Date(scheduledAt);
    if (isNaN(scheduled.getTime()) || scheduled <= new Date()) {
      return NextResponse.json({ error: "Waktu jadwal harus di masa depan" }, { status: 400 });
    }

    const supa = getAdminClient();
    const { data, error } = await supa.from("scheduled_broadcasts").insert({
      message,
      image_url: imageUrl || null,
      target_type: targetType,
      scheduled_at: scheduled.toISOString(),
      status: "pending",
    }).select().single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, broadcast: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — daftar broadcast terjadwal
export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supa = getAdminClient();
  const { data, error } = await supa
    .from("scheduled_broadcasts")
    .select("*")
    .order("scheduled_at", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ broadcasts: data || [] });
}

// DELETE — batalkan jadwal
export async function DELETE(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supa = getAdminClient();
  await supa.from("scheduled_broadcasts").delete().eq("id", id).eq("status", "pending");

  return NextResponse.json({ ok: true });
}

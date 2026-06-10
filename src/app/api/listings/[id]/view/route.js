import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/listings/[id]/view  -> tambah 1 view (atomik via RPC)
export async function POST(req, { params }) {
  try {
    const { id } = params;
    // batasi agar tidak gampang di-spam dari satu IP
    const rl = rateLimit(`view:${getClientIp(req)}:${id}`, {
      limit: 1,
      windowMs: 6 * 60 * 60 * 1000, // 1 view / 6 jam / IP / listing
    });
    if (!rl.ok) return NextResponse.json({ ok: true, counted: false });

    const supa = getAdminClient();
    const { error } = await supa.rpc("increment_listing_views", { lid: id });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, counted: true });
  } catch (e) {
    // jangan ganggu UX kalau gagal — view counter bukan kritikal
    return NextResponse.json({ ok: false, error: e.message }, { status: 200 });
  }
}

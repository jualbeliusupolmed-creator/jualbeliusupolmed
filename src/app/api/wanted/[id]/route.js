import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// PATCH /api/wanted/[id] -> update status (e.g. mark as resolved)
export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { action, status } = body;

    const supa = getAdminClient();

    if (action === "resolve" || status === "resolved") {
      const { data, error } = await supa
        .from("wanted_listings")
        .update({ status: "resolved" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, listing: data });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/wanted/[id] -> delete listing
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const supa = getAdminClient();
    const { error } = await supa.from("wanted_listings").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

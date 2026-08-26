import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/auth";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

export async function PATCH(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, is_active } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    const supa = getAdminClient();
    const { error } = await supa
      .from("teman_profiles")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return jawabGalat(err);
  }
}

export async function DELETE(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    const supa = getAdminClient();
    const { error } = await supa.from("teman_profiles").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return jawabGalat(err);
  }
}

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/settings/transaction-mode
// Mengambil konfigurasi mode transaksi saat ini ('in_app_chat' atau 'whatsapp')
export async function GET() {
  try {
    const supa = getAdminClient();
    const { data, error } = await supa
      .from("system_settings")
      .select("value")
      .eq("key", "transaction_mode")
      .maybeSingle();

    if (error || !data || !data.value) {
      // Fallback default
      return NextResponse.json({ mode: "in_app_chat" });
    }

    return NextResponse.json({
      mode: data.value.mode || "in_app_chat",
      updated_at: data.value.updated_at || null,
    });
  } catch (err) {
    return NextResponse.json({ mode: "in_app_chat" });
  }
}

// POST /api/settings/transaction-mode
// Mengubah mode transaksi (khusus admin)
export async function POST(req) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: "Akses ditolak. Sesi admin diperlukan." }, { status: 401 });
    }

    const body = await req.json();
    const { mode } = body;

    if (mode !== "whatsapp" && mode !== "in_app_chat") {
      return NextResponse.json(
        { error: "Mode tidak valid. Harus 'whatsapp' atau 'in_app_chat'." },
        { status: 400 }
      );
    }

    const supa = getAdminClient();
    const payload = {
      mode,
      description:
        mode === "whatsapp"
          ? "Mode 1: Transaksi & Negosiasi langsung via WhatsApp Penjual"
          : "Mode 2: Transaksi & Negosiasi via In-App Direct Message Web",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supa.from("system_settings").upsert(
      {
        key: "transaction_mode",
        value: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      throw error;
    }

    // Catat log admin
    supa.from("admin_logs").insert({
      action: "update_transaction_mode",
      details: { mode },
    }).then(() => {}, () => {});

    return NextResponse.json({ ok: true, mode, message: "Mode transaksi berhasil diperbarui." });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal mengubah mode transaksi." },
      { status: 500 }
    );
  }
}

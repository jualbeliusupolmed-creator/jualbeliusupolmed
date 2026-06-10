import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createSnapTransaction } from "@/lib/midtrans";
import { getSettings, soldFeeFrom } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/listings/[id]  -> detail listing (dipakai halaman edit)
export async function GET(req, { params }) {
  try {
    const { id } = params;
    const supa = getAdminClient();
    const { data, error } = await supa
      .from("listings")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ listing: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/listings/[id]  -> mark_sold | update_stock | edit
export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const supa = getAdminClient();

    // ── Edit iklan ─────────────────────────────────────────────────────────
    if (body.action === "edit") {
      const updates = {};
      if (body.title !== undefined) updates.title = String(body.title).trim();
      if (body.description !== undefined)
        updates.description = String(body.description || "").trim();
      if (body.price !== undefined)
        updates.price = Math.max(0, Math.round(Number(body.price) || 0));
      if (body.stock !== undefined)
        updates.stock = Math.max(0, Number(body.stock) || 0);
      if (body.category !== undefined) updates.category = body.category;
      if (body.seller_name !== undefined)
        updates.seller_name = String(body.seller_name).trim();
      if (body.image_url !== undefined) updates.image_url = body.image_url || null;

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
      }

      const { data, error } = await supa
        .from("listings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Galeri (kolom `images`) — non-fatal jika migration belum dijalankan.
      if (Array.isArray(body.images)) {
        await supa.from("listings").update({ images: body.images }).eq("id", id);
      }
      return NextResponse.json({ listing: data });
    }

    // ── Update stok ────────────────────────────────────────────────────────
    if (body.action === "update_stock") {
      const stock = Math.max(0, Number(body.stock) || 0);
      const { data, error } = await supa
        .from("listings")
        .update({ stock, status: stock === 0 ? "sold" : "active" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ listing: data });
    }

    // ── Mark sold ──────────────────────────────────────────────────────────
    if (body.action === "mark_sold") {
      const soldPrice = Math.round(Number(body.sold_price) || 0);
      const settings = await getSettings();
      const fee = soldFeeFrom(settings.pricing, soldPrice);
      const { data: listing, error } = await supa
        .from("listings")
        .update({
          status: "sold",
          sold_price: soldPrice,
          sold_fee: fee,
          stock: 0,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Catat fee sebagai payment pending
      await supa.from("payments").insert({
        listing_id: id,
        type: "sold_fee",
        amount: fee,
        status: "pending",
        midtrans_order_id: `SOLDFEE-${id.slice(0, 8)}-${Date.now()}`,
      });

      let snapToken = null;
      try {
        const tx = await createSnapTransaction({
          orderId: `SOLDFEE-${id.slice(0, 8)}-${Date.now()}`,
          amount: fee,
          customerName: listing.seller_name,
          customerWa: listing.seller_wa,
          itemName: `Fee terjual: ${listing.title}`,
        });
        snapToken = tx.token;
      } catch (e) {
        console.error("soldfee charge:", e?.message);
      }

      return NextResponse.json({ listing, fee, snapToken });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, soldFeeFrom } from "@/lib/settings";
import { getSellerSession, isAdmin } from "@/lib/auth";

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

    // -- Auth check -----------------------------------------------------------
    const sessionWa = getSellerSession();
    const isAd = isAdmin();

    const { data: currentListing, error: currentError } = await supa
      .from("listings")
      .select("seller_wa, title, seller_name, price")
      .eq("id", id)
      .single();

    if (currentError || !currentListing) {
      return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    }

    // Otorisasi HANYA dari sesi login tepercaya — JANGAN percaya seller_wa dari body
    // (nomor WA penjual bersifat publik → dulu bisa dipakai bypass = edit iklan orang lain).
    if (!isAd && sessionWa !== currentListing.seller_wa) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Edit iklan ─────────────────────────────────────────────────────────
    if (body.action === "edit") {
      const updates = {};
      let titleChangedToDigital = false;
      let categoryChangedToDigital = false;

      const { data: oldListing } = await supa
        .from("listings")
        .select("category, title, status")
        .eq("id", id)
        .single();

      const digitalKeywords = ["jasa", "digital", "akun", "voucher", "premium"];

      if (body.title !== undefined) {
        if (oldListing?.status !== "active") {
          updates.title = String(body.title).trim();
          const isNewTitleDigital = digitalKeywords.some(term => updates.title.toLowerCase().includes(term));
          const isOldTitleDigital = oldListing?.title ? digitalKeywords.some(term => oldListing.title.toLowerCase().includes(term)) : false;
          if (isNewTitleDigital && !isOldTitleDigital) titleChangedToDigital = true;
        }
      }
      if (body.category !== undefined) {
        if (oldListing?.status !== "active") {
          updates.category = body.category;
          const isNewCatDigital = digitalKeywords.some(term => updates.category.toLowerCase().includes(term));
          const isOldCatDigital = oldListing?.category ? digitalKeywords.some(term => oldListing.category.toLowerCase().includes(term)) : false;
          if (isNewCatDigital && !isOldCatDigital) categoryChangedToDigital = true;
        }
      }

      if (body.description !== undefined) updates.description = String(body.description || "").trim();
      if (body.price !== undefined) updates.price = Math.max(0, Math.round(Number(body.price) || 0));
      if (body.stock !== undefined) updates.stock = Math.max(0, Number(body.stock) || 0);
      if (body.seller_name !== undefined) updates.seller_name = String(body.seller_name).trim();
      if (body.image_url !== undefined) updates.image_url = body.image_url || null;
      if (body.campus !== undefined) updates.campus = body.campus;
      if (body.area !== undefined) updates.area = String(body.area || "").trim();

      if (titleChangedToDigital || categoryChangedToDigital) updates.status = "pending";

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

      if (Array.isArray(body.images)) {
        await supa.from("listings").update({ images: body.images }).eq("id", id);
      }
      return NextResponse.json({ listing: data, reVerify: (titleChangedToDigital || categoryChangedToDigital) });
    }

    // ── Update stok ────────────────────────────────────────────────────────
    if (body.action === "update_stock") {
      const stock = Math.max(0, Number(body.stock) || 0);
      const updates = { stock };
      let fee = 0;
      let paymentUrl = null;

      if (stock === 0) {
        delete updates.stock;
        const soldPrice = currentListing.price || 0;
        updates.sold_price = soldPrice;
        updates.status = "sold";
        const settings = await getSettings();
        fee = soldFeeFrom(settings.pricing, soldPrice);
        updates.sold_fee = fee;
      } else {
        updates.status = "active";
      }

      const { data: listing, error } = await supa
        .from("listings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      if (stock === 0 && fee > 0) {
        const orderId = `SOLDFEE-${id.slice(0, 8)}-${Date.now()}`;
        await supa.from("payments").insert({
          listing_id: id,
          type: "sold_fee",
          amount: fee,
          status: "pending",
          midtrans_order_id: orderId,
          meta: { seller_wa: currentListing.seller_wa },
        });

        paymentUrl = "/qris.png";
        return NextResponse.json({ listing, fee, paymentUrl, orderId });
      }

      return NextResponse.json({ listing, fee, paymentUrl });
    }

    // ── Mark sold ──────────────────────────────────────────────────────────
    if (body.action === "mark_sold") {
      const soldPrice = Math.round(Number(body.sold_price) || currentListing.price || 0);
      const settings = await getSettings();
      const fee = soldFeeFrom(settings.pricing, soldPrice);

      // Langsung tandai sold — fee dibayar terpisah via tagihan di dashboard
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

      let paymentUrl = null;
      let orderId = null;

      if (fee > 0) {
        orderId = `SOLDFEE-${id.slice(0, 8)}-${Date.now()}`;
        await supa.from("payments").insert({
          listing_id: id,
          type: "sold_fee",
          amount: fee,
          status: "pending",
          midtrans_order_id: orderId,
          meta: { seller_wa: currentListing.seller_wa },
        });

        paymentUrl = "/qris.png";
      }

      return NextResponse.json({ listing, fee, paymentUrl, orderId });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/listings/[id]  -> seller hapus iklan milik sendiri (expired/suspended/sold only)
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const supa = getAdminClient();
    const sessionWa = getSellerSession();

    if (!sessionWa) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: listing } = await supa
      .from("listings")
      .select("seller_wa, status, title")
      .eq("id", id)
      .single();

    if (!listing) return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    if (listing.seller_wa !== sessionWa) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["expired", "suspended", "sold"].includes(listing.status)) {
      return NextResponse.json(
        { error: "Iklan aktif tidak bisa dihapus. Tandai terjual atau tunggu masa tayang habis." },
        { status: 400 }
      );
    }

    const { error } = await supa.from("listings").delete().eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

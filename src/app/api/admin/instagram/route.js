import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { publishQueuedListingInstagram } from "@/lib/listingInstagram";
import { publishQueuedMadingInstagram } from "@/lib/madingInstagram";
import { siteOriginFromRequest } from "@/lib/instagramQueue";
import { waitUntil } from "@vercel/functions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supa = getAdminClient();
    
    // Fetch Mading/Menfess publications
    const { data: madingData, error: madingErr } = await supa
      .from("mading_instagram_publications")
      .select("*, mading_posts(title, content, type, sender_name)")
      .order("updated_at", { ascending: false })
      .limit(50);
      
    if (madingErr) throw madingErr;

    // Fetch Listing/Katalog publications
    const { data: listingData, error: listingErr } = await supa
      .from("listing_instagram_publications")
      .select("*, listings(title, price, seller_name)")
      .order("updated_at", { ascending: false })
      .limit(50);
      
    if (listingErr) throw listingErr;

    // Normalize data
    const madingItems = (madingData || []).map(item => ({
      ...item,
      source: "Menfess",
      title: item.mading_posts?.title || item.mading_posts?.type || "Menfess",
      detail: item.mading_posts?.sender_name || "Anonim",
    }));

    const listingItems = (listingData || []).map(item => ({
      ...item,
      source: "Katalog",
      title: item.listings?.title || "Katalog Produk",
      detail: item.listings?.seller_name || "Penjual",
    }));

    // Combine and sort by updated_at descending
    const items = [...madingItems, ...listingItems]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 100);

    // Calculate stats
    const stats = items.reduce(
      (acc, curr) => {
        if (!acc[curr.status]) acc[curr.status] = 0;
        acc[curr.status]++;
        if (curr.source === "Menfess") acc.menfess++;
        else acc.katalog++;
        return acc;
      },
      { queued: 0, processing: 0, published: 0, failed: 0, menfess: 0, katalog: 0 }
    );

    // Otomatis picu pemrosesan antrean di background jika ada item yang menunggu
    if (stats.queued > 0 && typeof waitUntil === "function") {
      const origin = siteOriginFromRequest(req);
      try {
        waitUntil(
          Promise.allSettled([
            publishQueuedMadingInstagram({ origin, limit: 5 }),
            publishQueuedListingInstagram({ origin, limit: 5 }),
          ])
        );
      } catch (_) {}
    }

    return NextResponse.json({ ok: true, stats, items });
  } catch (e) {
    return NextResponse.json({ error: "Gagal memproses data Instagram." }, { status: 500 });
  }
}

export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const supa = getAdminClient();

  if (body.action === "retry_failed") {
    try {
      const now = new Date().toISOString();
      await supa
        .from("mading_instagram_publications")
        .update({ status: "queued", attempts: 0, updated_at: now, next_attempt_at: null, last_error: null })
        .eq("status", "failed");

      await supa
        .from("listing_instagram_publications")
        .update({ status: "queued", attempts: 0, updated_at: now, next_attempt_at: null, last_error: null })
        .eq("status", "failed");

      return NextResponse.json({ ok: true, message: "Semua antrean gagal di-reset menjadi Queued." });
    } catch (error) {
      return NextResponse.json({ error: "Gagal mereset antrean gagal." }, { status: 500 });
    }
  }

  if (body.action === "process_queue") {
    try {
      const origin = siteOriginFromRequest(req);
      const limit = Math.min(10, Math.max(1, Number(body.limit) || 5));
      const resultsMading = await publishQueuedMadingInstagram({ origin, limit });
      const resultsListing = await publishQueuedListingInstagram({ origin, limit });
      const totalProcessed = resultsMading.length + resultsListing.length;
      return NextResponse.json({ ok: true, message: `Berhasil memproses ${totalProcessed} item antrean.` });
    } catch (error) {
      return NextResponse.json({ error: error.message || "Gagal memproses antrean." }, { status: 500 });
    }
  }

  if (body.action === "process_single") {
    try {
      const origin = siteOriginFromRequest(req);
      const limit = 1;
      let results = [];
      if (body.source === "Katalog") {
        results = await publishQueuedListingInstagram({ origin, listingId: body.id, limit });
      } else if (body.source === "Menfess") {
        results = await publishQueuedMadingInstagram({ origin, postId: body.id, limit });
      } else {
        return NextResponse.json({ error: "Sumber tidak valid" }, { status: 400 });
      }

      const item = results[0];
      if (!item) {
        return NextResponse.json({ ok: true, message: "Item sudah terpublish atau hilang dari antrean." });
      }
      if (item.status === "published") {
        return NextResponse.json({ ok: true, message: "✅ Berhasil diterbitkan ke Instagram!" });
      }
      if (item.status === "queued") {
        return NextResponse.json({ ok: true, message: "🔄 Masuk antrean ulang, akan dicoba kembali nanti." });
      }
      // status === "failed"
      return NextResponse.json({ error: item.error || "Gagal memproses item ke Instagram." }, { status: 422 });
    } catch (error) {
      return NextResponse.json({ error: "Gagal memproses item." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

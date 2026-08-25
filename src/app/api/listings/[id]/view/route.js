import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sendWa } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

// Milestone yang akan memicu notifikasi WA ke penjual
const VIEW_MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

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
    if (error) {
      // Fallback jika RPC belum ada atau gagal
      const { data: item } = await supa.from("listings").select("views").eq("id", id).single();
      if (item) {
        await supa.from("listings").update({ views: (item.views || 0) + 1 }).eq("id", id);
      }
    }

    // Cek milestone secara async (fire-and-forget, jangan blok response)
    checkAndNotifyMilestone(supa, id).catch(() => {});

    return NextResponse.json({ ok: true, counted: true });
  } catch (e) {
    // jangan ganggu UX kalau gagal — view counter bukan kritikal
    return NextResponse.json({ ok: false, error: e.message }, { status: 200 });
  }
}

async function checkAndNotifyMilestone(supa, listingId) {
  const { data: listing } = await supa
    .from("listings")
    .select("id, title, views, seller_wa, seller_name, last_milestone_notified")
    .eq("id", listingId)
    .single();

  if (!listing?.seller_wa || !listing.views) return;

  const views = Number(listing.views);
  const lastNotified = Number(listing.last_milestone_notified || 0);

  // Cari milestone tertinggi yang sudah terlampaui tapi belum dinotif
  const nextMilestone = VIEW_MILESTONES.find(m => views >= m && m > lastNotified);
  if (!nextMilestone) return;

  // Update last_milestone_notified dulu (optimistic) untuk cegah double-send
  const { error: updateErr } = await supa
    .from("listings")
    .update({ last_milestone_notified: nextMilestone })
    .eq("id", listingId)
    .eq("last_milestone_notified", lastNotified); // Optimistic locking

  if (updateErr) return; // Race condition: milestone sudah diupdate di tempat lain

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
  const slug = buildSlug(listing.title, listing.id);

  const emoji = nextMilestone >= 500 ? "🔥🔥🔥" : nextMilestone >= 100 ? "🚀🚀" : "🎉";
  const msg =
    `${emoji} *Iklanmu makin dilihat orang!*\n\n` +
    `Hei ${listing.seller_name || "Penjual"},\n` +
    `Iklan *"${listing.title}"* baru saja melewati *${nextMilestone} kali dilihat*!\n\n` +
    `📈 Makin banyak yang tertarik. Pastikan kamu siap merespon calon pembeli ya!\n\n` +
    `👉 Lihat iklanmu: ${baseUrl}/produk/${slug}\n\n` +
    `_Ketik INFO ke bot ini untuk melihat statistik iklan lengkap._`;

  await sendWa(listing.seller_wa, msg, null, null, {
    jenis: "milestone_view",
    listingId: listing.id,
  }).catch(() => {});
}


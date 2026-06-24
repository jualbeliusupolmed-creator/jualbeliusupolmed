import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { notifyAdminNewListing, postToGroup, notifyWantedBuyers, sendWa } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// Field listing yang boleh diubah admin lewat update_listing
const LISTING_FIELDS = [
  "seller_name",
  "seller_wa",
  "title",
  "description",
  "price",
  "stock",
  "category",
  "type",
  "image_url",
  "status",
  "featured",
  "featured_until",
  "bumped_at",
  "expires_at",
  "views",
  "campus",
  "area",
];

const PERIOD_MS = 14 * 864e5; // masa tayang 14 hari

const LISTING_STATUSES = ["pending", "active", "expired", "sold", "suspended"];

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// POST /api/admin/action  { action, ... }
export async function POST(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { action, id, wa } = body;
    const supa = getAdminClient();
    // Info tambahan (mis. peringatan broadcast gagal) yang ikut dikirim ke UI admin
    let warning = null;

    switch (action) {
      // ── Listing: aksi cepat ────────────────────────────────────────────
      case "activate": {
        // Fetch listing info before updating for WA notification
        const { data: listingInfo } = await supa
          .from("listings")
          .select("seller_wa, seller_name, title, id, price, stock, category, description")
          .eq("id", id)
          .maybeSingle();

        // Aktifkan + perpanjang masa tayang
        const settings = await getSettings().catch(() => null);
        const days = Math.max(1, Number(settings?.pricing?.listingDays) || 14);
        await supa
          .from("listings")
          .update({
            status: "active",
            expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", id);

        // Broadcast to WA Group when admin activates manually
        if (listingInfo) {
          const [groupRes] = await Promise.allSettled([
            postToGroup(listingInfo),
            notifyWantedBuyers(listingInfo)
          ]);
          const broadcast =
            groupRes.status === "fulfilled"
              ? groupRes.value
              : { ok: false, error: groupRes.reason?.message };
          if (!broadcast?.ok) {
            console.error("[activate] Broadcast grup gagal:", JSON.stringify(broadcast));
            warning = broadcast?.skipped
              ? "Iklan aktif, tapi broadcast grup TIDAK terkirim: FONNTE_TOKEN/FONNTE_WA_GROUP_ID belum di-set di server."
              : `Iklan aktif, tapi broadcast grup gagal: ${broadcast?.error || broadcast?.data?.reason || "cek log server"}.`;
          }
        }
        break;
      }
      case "suspend":
        await supa.from("listings").update({ status: "suspended" }).eq("id", id);
        break;
      case "delete":
        await supa.from("listings").delete().eq("id", id);
        break;

      // ── Listing: aksi massal (bulk) ─────────────────────────────────────
      case "bulk": {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (ids.length === 0) {
          return NextResponse.json({ error: "Tidak ada item dipilih" }, { status: 400 });
        }
        if (body.op === "activate") {
          await supa
            .from("listings")
            .update({
              status: "active",
              expires_at: new Date(Date.now() + PERIOD_MS).toISOString(),
            })
            .in("id", ids);
        } else if (body.op === "suspend") {
          await supa.from("listings").update({ status: "suspended" }).in("id", ids);
        } else if (body.op === "delete") {
          await supa.from("listings").delete().in("id", ids);
        } else {
          return NextResponse.json({ error: "Operasi bulk tidak dikenal" }, { status: 400 });
        }
        break;
      }
      case "feature": {
        const days = Math.max(1, Number(body.days) || 7);
        await supa
          .from("listings")
          .update({
            featured: true,
            featured_until: new Date(Date.now() + days * 864e5).toISOString(),
          })
          .eq("id", id);
        break;
      }
      case "unfeature":
        await supa
          .from("listings")
          .update({ featured: false, featured_until: null })
          .eq("id", id);
        break;
      case "bump_now":
        await supa
          .from("listings")
          .update({ bumped_at: new Date().toISOString() })
          .eq("id", id);
        break;

      // ── Listing: edit penuh ────────────────────────────────────────────
      case "update_listing": {
        const updates = {};
        for (const key of LISTING_FIELDS) {
          if (body[key] === undefined) continue;
          if (key === "price" || key === "views")
            updates[key] = Math.max(0, Math.round(Number(body[key]) || 0));
          else if (key === "stock")
            updates[key] = Math.max(0, Number(body[key]) || 0);
          else if (key === "featured") updates[key] = !!body[key];
          else if (key === "status") {
            if (LISTING_STATUSES.includes(body[key])) updates[key] = body[key];
          } else updates[key] = body[key] === "" ? null : body[key];
        }
        if (Object.keys(updates).length === 0 && !Array.isArray(body.images)) {
          return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
        }
        if (Object.keys(updates).length > 0) {
          const { error } = await supa.from("listings").update(updates).eq("id", id);
          if (error) throw new Error(error.message);
        }
        // Galeri (kolom `images`) — non-fatal bila kolom belum ada
        if (Array.isArray(body.images)) {
          await supa.from("listings").update({ images: body.images }).eq("id", id);
        }
        break;
      }

      // ── Blacklist ──────────────────────────────────────────────────────
      case "blacklist": {
        const normalizedWa = formatWa(wa);
        await supa.from("blacklist").upsert(
          { wa: normalizedWa, reason: body.reason || null },
          { onConflict: "wa" }
        );
        // Suspend semua listing dari nomor ini (kedua format)
        await supa.from("listings").update({ status: "suspended" }).eq("seller_wa", normalizedWa);
        break;
      }
      case "unblacklist":
        await supa.from("blacklist").delete().eq("id", id);
        break;

      // ── Laporan ────────────────────────────────────────────────────────
      case "resolve_report":
        await supa.from("reports").update({ status: "resolved" }).eq("id", id);
        break;
      case "delete_report":
        await supa.from("reports").delete().eq("id", id);
        break;

      // ── Rating ─────────────────────────────────────────────────────────
      case "delete_rating":
        await supa.from("seller_ratings").delete().eq("id", id);
        break;

      // ── wanted_listings ────────────────────────────────────────────────
      case "resolve_wanted":
        await supa.from("wanted_listings").update({ status: "resolved" }).eq("id", id);
        break;
      case "delete_wanted":
        await supa.from("wanted_listings").delete().eq("id", id);
        break;

      // ── Transaksi / payment ────────────────────────────────────────────
      case "update_payment": {
        const status = body.status;
        if (!["pending", "paid", "failed", "expired"].includes(status)) {
          return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
        }
        const { data: payment } = await supa.from("payments").update({ status }).eq("id", id).select().single();
        
        // Auto-activate listing and send notifications if marked as paid
        if (payment && status === "paid" && payment.listing_id) {
          if (payment.type === "iklan" || payment.type === "bump") {
            const { data: listing } = await supa
              .from("listings")
              .update({ status: "active", bumped_at: new Date().toISOString() })
              .eq("id", payment.listing_id)
              .select()
              .single();

            if (listing && payment.type === "iklan") {
              await Promise.allSettled([
                postToGroup(listing),
                notifyWantedBuyers(listing)
              ]);
            }
          } else if (payment.type === "featured") {
            const days = payment.meta?.days || 1;
            const until = new Date(Date.now() + days * 864e5).toISOString();
            await supa
              .from("listings")
              .update({ featured: true, featured_until: until, bumped_at: new Date().toISOString() })
              .eq("id", payment.listing_id);
          } else if (payment.type === "autobump") {
            const until = new Date(Date.now() + 7 * 864e5).toISOString();
            await supa
              .from("listings")
              .update({ auto_bump_until: until, bumped_at: new Date().toISOString() })
              .eq("id", payment.listing_id);
          } else if (payment.type === "subscribe") {
            const wa = payment.meta?.wa;
            if (wa) {
              const until = new Date(Date.now() + 30 * 864e5).toISOString();
              await supa
                .from("seller_profiles")
                .update({ 
                  subscription_tier: "pro", 
                  subscription_expires_at: until 
                })
                .eq("wa", wa);
            }
          } else if (payment.type === "sold_fee") {
            await supa
              .from("listings")
              .update({ status: "sold", stock: 0 })
              .eq("id", payment.listing_id);
          }
        }
        break;
      }
      case "delete_payment":
        await supa.from("payments").delete().eq("id", id);
        break;

      case "approve_unlock_manual": {
        const { payment_id } = body;
        if (!payment_id) {
          return NextResponse.json({ error: "payment_id wajib diisi" }, { status: 400 });
        }
        
        // 1. Ambil data payment
        const { data: payment, error: pErr } = await supa
          .from("payments")
          .select("*")
          .eq("id", payment_id)
          .single();
          
        if (pErr || !payment) {
          return NextResponse.json({ error: "Transaksi pembayaran tidak ditemukan" }, { status: 404 });
        }
        
        if (payment.status === "paid") {
          return NextResponse.json({ error: "Transaksi sudah berstatus lunas sebelumnya" }, { status: 400 });
        }
        
        const wantedId = payment.meta?.unlock_wanted_id;
        const requesterWa = payment.meta?.requester_wa;
        
        if (!wantedId || !requesterWa) {
          return NextResponse.json({ error: "Data pencarian atau nomor pemohon tidak lengkap di transaksi" }, { status: 400 });
        }
        
        // 2. Ambil detail postingan Cari Barang (wanted_listings)
        const { data: wanted, error: wErr } = await supa
          .from("wanted_listings")
          .select("*")
          .eq("id", wantedId)
          .single();
          
        if (wErr || !wanted) {
          return NextResponse.json({ error: "Postingan Cari Barang tidak ditemukan" }, { status: 404 });
        }
        
        // 3. Update status payment menjadi paid
        const { error: uErr } = await supa
          .from("payments")
          .update({ status: "paid" })
          .eq("id", payment_id);
          
        if (uErr) {
          return NextResponse.json({ error: "Gagal memperbarui transaksi pembayaran" }, { status: 500 });
        }
        
        // 4. Kirim WhatsApp berisi detail kontak pembeli ke pemohon menggunakan Fonnte
        const msg = 
          `✅ *PEMBAYARAN QRIS MANUAL DISETUJUI*\n\n` +
          `Halo, permintaan buka kontak Anda untuk pencarian barang berikut telah disetujui:\n` +
          `🔍 *Cari Barang:* ${wanted.title}\n\n` +
          `Berikut adalah kontak pembeli yang mengajukan pencarian:\n` +
          `👤 *Nama:* ${wanted.buyer_name}\n` +
          `📱 *No. WhatsApp:* ${wanted.buyer_wa}\n\n` +
          `Silakan langsung hubungi pembeli di atas melalui link berikut:\n` +
          `👉 https://wa.me/${wanted.buyer_wa}?text=${encodeURIComponent(`Halo ${wanted.buyer_name}, saya melihat postingan Anda di Jual Beli Medan mencari "${wanted.title}". Saya ada barangnya.`)}\n\n` +
          `Terima kasih telah menggunakan Jual Beli Medan!`;
          
        const fonnteRes = await sendWa(requesterWa, msg);
        if (!fonnteRes?.ok) {
          console.error("[approve_unlock_manual] Gagal kirim WA ke pemohon:", fonnteRes);
          warning = `Pembayaran disetujui, namun gagal mengirim pesan WhatsApp ke pemohon: ${fonnteRes?.error || "cek log server"}`;
        }
        
        break;
      }

      // ── Kategori ───────────────────────────────────────────────────────
      case "category_upsert": {
        const name = String(body.name || "").trim();
        if (!name) return NextResponse.json({ error: "Nama wajib" }, { status: 400 });
        const row = {
          name,
          slug: slugify(body.slug || name),
          icon: body.icon || "🏷️",
          sort_order: Number(body.sort_order) || 0,
        };
        if (id) {
          await supa.from("categories").update(row).eq("id", id);
        } else {
          const { error } = await supa
            .from("categories")
            .upsert(row, { onConflict: "slug" });
          if (error) throw new Error(error.message);
        }
        break;
      }
      case "category_delete":
        await supa.from("categories").delete().eq("id", id);
        break;

      // ── Pengaturan situs ───────────────────────────────────────────────
      case "save_settings": {
        const { key, value } = body;
        if (!key || typeof value !== "object") {
          return NextResponse.json({ error: "key/value tidak valid" }, { status: 400 });
        }
        const { error } = await supa
          .from("settings")
          .upsert(
            { key, value, updated_at: new Date().toISOString() },
            { onConflict: "key" }
          );
        if (error) throw new Error(error.message);
        break;
      }

      case "pause_bot": {
        const normalizedWa = formatWa(wa);
        if (!normalizedWa) return NextResponse.json({ error: "WA wajib" }, { status: 400 });
        const settings = await getSettings().catch(() => null);
        let currentPaused = settings?.bot?.paused_users || [];
        if (!currentPaused.includes(normalizedWa)) {
          currentPaused = [...currentPaused, normalizedWa];
          await supa.from("settings").update({ value: { paused_users: currentPaused } }).eq("key", "bot");
          await sendWa(normalizedWa, "⏸ Bot Anda telah di-pause sementara oleh Admin. Hubungi admin jika ada pertanyaan.");
        }
        break;
      }

      case "unpause_bot": {
        const normalizedWa = formatWa(wa);
        if (!normalizedWa) return NextResponse.json({ error: "WA wajib" }, { status: 400 });
        const settings = await getSettings().catch(() => null);
        let currentPaused = settings?.bot?.paused_users || [];
        if (currentPaused.includes(normalizedWa)) {
          currentPaused = currentPaused.filter((p) => p !== normalizedWa);
          await supa.from("settings").update({ value: { paused_users: currentPaused } }).eq("key", "bot");
          await sendWa(normalizedWa, "🤖 Bot telah diaktifkan kembali oleh Admin. Anda sekarang dapat menggunakan fitur otomatis bot lagi!");
        }
        break;
      }

      // ── Profil Penjual ──────────────────────────────────────────────────
      case "update_seller_profile": {
        const normalizedWa = formatWa(wa);
        if (!normalizedWa) return NextResponse.json({ error: "WA wajib" }, { status: 400 });
        const payload = { wa: normalizedWa, name: body.name || "Penjual", bio: body.bio || null };
        if (body.trusted_seller !== undefined) {
          payload.trusted_seller = !!body.trusted_seller;
        }

        const { error } = await supa.from("seller_profiles").upsert(
          payload,
          { onConflict: "wa" }
        );
        if (error) throw new Error(error.message);

        // update nama di seluruh iklan berjalan milik penjual ini
        if (body.name) {
          await supa.from("listings").update({ seller_name: body.name }).eq("seller_wa", normalizedWa);
        }
        break;
      }

      // ── Blogs ───────────────────────────────────────────────────────────
      case "delete_blog":
        await supa.from("blogs").delete().eq("id", id);
        break;

      default:
        return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    }
    return NextResponse.json(warning ? { ok: true, warning } : { ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

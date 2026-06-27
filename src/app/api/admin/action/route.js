import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { notifyAdminNewListing, postToGroup, sendWa } from "@/lib/fonnte";
import { pushCategorySubscribers } from "@/lib/webpush";
import { logError } from "@/lib/logError";
import { postToFacebook, postToInstagram } from "@/lib/meta";

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

// PERIOD_MS: fallback untuk bulk activate (single activate membaca dari settings secara langsung)
const PERIOD_MS = 14 * 864e5;

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
      case "post_meta": {
        const { listing } = body;
        if (!listing || !listing.id) throw new Error("Iklan tidak ditemukan");
        const settings = await getSettings().catch(() => null);
        const metaCfg = settings?.meta;
        if (!metaCfg?.accessToken || (!metaCfg?.fbPageId && !metaCfg?.igUserId)) {
          throw new Error("Pengaturan Meta belum lengkap (Token/Page ID belum diisi)");
        }

        const priceText = listing.price > 0 ? `Rp ${listing.price.toLocaleString("id-ID")}` : "GRATIS";
        const caption = `${listing.title}\n\nHarga: ${priceText}\nKondisi: ${listing.stock > 1 ? "Tersedia" : "Terbatas"}\nLokasi: ${listing.campus} - ${listing.area || "-"}\n\n${listing.description || ""}\n\n👉 Pesan sekarang via WA (Cek di website)\n\n#JualBeliUSU #BarangBekas #AnakUSU`;
        
        // Use the raw image or fallback to dynamic OG image
        const imgUrl = (listing.images && listing.images[0]) || `https://jualbeliusu.com/api/og?id=${listing.id}`;

        let results = [];
        if (metaCfg.fbPageId) {
          try {
            await postToFacebook(metaCfg.fbPageId, metaCfg.accessToken, imgUrl, caption);
            results.push("Facebook ✅");
          } catch (e) {
            results.push(`Facebook ❌ (${e.message})`);
          }
        }
        if (metaCfg.igUserId) {
          try {
            await postToInstagram(metaCfg.igUserId, metaCfg.accessToken, imgUrl, caption);
            results.push("Instagram ✅");
          } catch (e) {
            results.push(`Instagram ❌ (${e.message})`);
          }
        }
        warning = `Hasil Meta Auto-Post: ${results.join(" | ")}`;
        break;
      }
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
          const activateSettings = await getSettings().catch(() => null);
          pushCategorySubscribers(supa, listingInfo).catch(() => {});
          const [groupRes] = await Promise.allSettled([
            postToGroup(listingInfo, activateSettings?.admin),
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
          const bulkSettings = await getSettings().catch(() => null);
          const bulkDays = Math.max(1, Number(bulkSettings?.pricing?.listingDays) || 14);
          await supa
            .from("listings")
            .update({
              status: "active",
              expires_at: new Date(Date.now() + bulkDays * 864e5).toISOString(),
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
              const paySettings = await getSettings().catch(() => null);
              pushCategorySubscribers(supa, listing).catch(() => {});
              await Promise.allSettled([
                postToGroup(listing, paySettings?.admin),
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
        if (!key || value == null || typeof value !== "object") {
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

      case "notify_group_pricing": {
        const { pricing: np } = body;
        const pricingSettings = await getSettings().catch(() => null);
        const groupJid = pricingSettings?.admin?.groupJid;
        if (!groupJid) return NextResponse.json({ error: "groupJid belum dikonfigurasi di Pengaturan Admin" }, { status: 400 });
        const fmtRp = (n) => Number(n) > 0 ? `Rp ${Number(n).toLocaleString("id-ID")}` : "Gratis";
        const modeLabel = (() => {
          const ad = Number(np?.adBarang || 0);
          const bump = Number(np?.bump || 0);
          const ft = Number(np?.featuredPerDay || 0);
          const hasSold = (np?.soldTiers || []).some(t => t.pct > 0 || t.flat > 0);
          if (ad === 0 && bump === 0 && ft === 0 && !hasSold) return "Gratis Semua";
          if (ad === 0 && hasSold) return "Jual Dulu (Komisi)";
          if (ad === 0 && !hasSold && (bump > 0 || ft > 0)) return "Freemium";
          return "Sewa Lapak";
        })();
        const msg =
          `📢 *Pembaruan Tarif Marketplace*\n\n` +
          `Mode: *${modeLabel}*\n\n` +
          `📦 Pasang iklan: *${fmtRp(np?.adBarang)}*\n` +
          `🔼 Bump/sundul: *${fmtRp(np?.bump)}*\n` +
          `⭐ Featured/hari: *${fmtRp(np?.featuredPerDay)}*\n` +
          `⏳ Durasi iklan: *${np?.listingDays || 14} hari*\n\n` +
          `_Tarif berlaku sekarang. Ketik MENU untuk info lanjut._`;
        await sendWa(groupJid, msg);
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

      case "set_distributor": {
        const normalizedWa = formatWa(wa);
        if (!normalizedWa) return NextResponse.json({ error: "WA wajib" }, { status: 400 });
        const { error } = await supa.from("seller_profiles").upsert(
          { wa: normalizedWa, distributor: !!body.distributor },
          { onConflict: "wa" }
        );
        if (error) throw new Error(error.message);
        break;
      }

      case "set_distributor_categories": {
        const normalizedWa = formatWa(wa);
        if (!normalizedWa) return NextResponse.json({ error: "WA wajib" }, { status: 400 });
        
        await supa.from("distributor_categories").delete().eq("seller_wa", normalizedWa);
        
        if (body.categories && body.categories.length > 0) {
          const insertData = body.categories.map(c => ({ seller_wa: normalizedWa, category: c }));
          const { error } = await supa.from("distributor_categories").insert(insertData);
          if (error) throw new Error(error.message);
        }
        break;
      }

      // ── Blogs ───────────────────────────────────────────────────────────
      case "delete_blog":
        await supa.from("blogs").delete().eq("id", id);
        break;

      // ── Sponsored listing ──────────────────────────────────────────────
      case "set_sponsored": {
        const days = Number(body.days) || 0;
        await supa
          .from("listings")
          .update({ sponsored_until: days > 0 ? new Date(Date.now() + days * 864e5).toISOString() : null })
          .eq("id", id);
        break;
      }

      // ── Reset PIN / OTP penjual ────────────────────────────────────────
      case "reset_pin": {
        const normalizedWa = formatWa(wa);
        if (!normalizedWa) return NextResponse.json({ error: "WA wajib" }, { status: 400 });
        await supa.from("otps").delete().eq("wa", normalizedWa);
        break;
      }

      // ── Award free bumps ke penjual ────────────────────────────────────
      case "award_bumps": {
        const normalizedWa = formatWa(wa);
        const bumpsToAdd = Math.max(1, Number(body.count) || 1);
        if (!normalizedWa) return NextResponse.json({ error: "WA wajib" }, { status: 400 });
        const { data: sp } = await supa.from("seller_profiles").select("free_bumps").eq("wa", normalizedWa).maybeSingle();
        const current = sp?.free_bumps || 0;
        await supa.from("seller_profiles").upsert(
          { wa: normalizedWa, free_bumps: current + bumpsToAdd },
          { onConflict: "wa" }
        );
        break;
      }

      // ── Hapus group post ───────────────────────────────────────────────
      case "delete_group_post":
        await supa.from("group_posts").delete().eq("id", id);
        break;

      // ── Hapus subscription ─────────────────────────────────────────────
      case "delete_subscription": {
        const tbl = body.type === "push" ? "push_subscriptions" : "category_subscriptions";
        await supa.from(tbl).delete().eq("id", id);
        break;
      }

      // ── Hide/unhide rating ─────────────────────────────────────────────
      case "hide_rating":
        await supa.from("seller_ratings").update({ hidden: true }).eq("id", id);
        break;
      case "show_rating":
        await supa.from("seller_ratings").update({ hidden: false }).eq("id", id);
        break;

      // ── Referral: award bumps manual via referrals table ──────────────
      case "resolve_referral":
        await supa.from("referrals").update({ status: "rewarded" }).eq("id", id);
        break;

      // ── Permintaan Ubah Profil ─────────────────────────────────────────
      case "approve_profile_change": {
        const { data: req, error: reqErr } = await supa
          .from("profile_change_requests")
          .select("*")
          .eq("id", id)
          .single();
        if (reqErr || !req) return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
        if (req.status !== "pending") return NextResponse.json({ error: "Request sudah diproses" }, { status: 400 });

        // Update profil penjual
        await supa
          .from("seller_profiles")
          .upsert({ wa: req.seller_wa, [req.field]: req.requested_value }, { onConflict: "wa" });

        // Jika nama berubah, update semua iklan aktif
        if (req.field === "name") {
          await supa
            .from("listings")
            .update({ seller_name: req.requested_value })
            .eq("seller_wa", req.seller_wa)
            .in("status", ["active", "pending"]);
        }

        // Tandai request sebagai approved
        await supa
          .from("profile_change_requests")
          .update({ status: "approved", reviewed_at: new Date().toISOString(), review_note: body.note || null })
          .eq("id", id);

        // Notifikasi penjual via WA
        const fieldLabel = req.field === "name" ? "nama" : "bio";
        await sendWa(req.seller_wa, `✅ *Permintaan perubahan ${fieldLabel} profil Anda disetujui!*\n\n${req.field === "name" ? `📛 Nama baru: *${req.requested_value}*` : `📝 Bio baru telah diperbarui.`}\n\nPerubahan sudah berlaku di profil publik Anda.`).catch(() => {});
        break;
      }

      case "reject_profile_change": {
        const { data: reqR, error: reqRErr } = await supa
          .from("profile_change_requests")
          .select("*")
          .eq("id", id)
          .single();
        if (reqRErr || !reqR) return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
        if (reqR.status !== "pending") return NextResponse.json({ error: "Request sudah diproses" }, { status: 400 });

        await supa
          .from("profile_change_requests")
          .update({ status: "rejected", reviewed_at: new Date().toISOString(), review_note: body.note || null })
          .eq("id", id);

        const fieldLabelR = reqR.field === "name" ? "nama" : "bio";
        const noteMsg = body.note ? `\n\nAlasan: _${body.note}_` : "";
        await sendWa(reqR.seller_wa, `❌ *Permintaan perubahan ${fieldLabelR} profil Anda ditolak.*${noteMsg}\n\nHubungi admin jika ada pertanyaan.`).catch(() => {});
        break;
      }

      // ── Distributor ────────────────────────────────────────────────────────
      case "set_distributor": {
        const normalizedWa = formatWa(wa);
        if (!normalizedWa) return NextResponse.json({ error: "WA wajib" }, { status: 400 });
        await supa.from("seller_profiles").upsert(
          { wa: normalizedWa, distributor: !!body.distributor },
          { onConflict: "wa" }
        );
        break;
      }

      case "set_distributor_categories": {
        const normalizedWa = formatWa(wa);
        if (!normalizedWa) return NextResponse.json({ error: "WA wajib" }, { status: 400 });
        const cats = Array.isArray(body.categories) ? body.categories : [];
        // Hapus lama, insert baru
        await supa.from("distributor_categories").delete().eq("seller_wa", normalizedWa);
        if (cats.length > 0) {
          await supa.from("distributor_categories").insert(
            cats.map((c) => ({ seller_wa: normalizedWa, category: c }))
          );
        }
        break;
      }

      // ── Tawaran Biaya Iklan ────────────────────────────────────────────────
      case "approve_fee_offer": {
        const { data: fl } = await supa.from("listings").select("id, title, seller_wa, fee_offer").eq("id", id).single();
        if (!fl) return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
        const newFee = Number(fl.fee_offer || 0);
        await supa.from("listings").update({ fee_offer_status: "approved" }).eq("id", id);
        await supa.from("payments").update({ amount: newFee }).eq("listing_id", id).eq("status", "pending");
        if (newFee === 0) {
          const expiresAt = new Date(Date.now() + 14 * 864e5).toISOString();
          await supa.from("listings").update({ status: "active", expires_at: expiresAt }).eq("id", id);
          await supa.from("payments").update({ status: "paid" }).eq("listing_id", id).eq("status", "pending");
          await sendWa(fl.seller_wa, `🎉 *Admin menyetujui tawaranmu!*\n\n📦 *${fl.title}*\n✅ Biaya digratiskan. Iklanmu langsung aktif! 🚀`).catch(() => {});
        } else {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
          await sendWa(fl.seller_wa,
            `🎉 *Admin menyetujui tawaranmu!*\n\n📦 *${fl.title}*\n💳 Biaya baru: *Rp ${newFee.toLocaleString("id-ID")}*\n\nKirim struk setelah transfer ke sini.`,
            `${baseUrl}/qris.png`
          ).catch(() => {});
        }
        break;
      }

      case "reject_fee_offer": {
        const { data: flr } = await supa.from("listings").select("id, title, seller_wa").eq("id", id).single();
        if (!flr) return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
        const { data: pmtR } = await supa.from("payments").select("amount").eq("listing_id", id).eq("status", "pending").maybeSingle();
        await supa.from("listings").update({ fee_offer: null, fee_offer_status: "rejected" }).eq("id", id);
        const noteMsg = body.note ? `\n\nAlasan: _${body.note}_` : "";
        await sendWa(flr.seller_wa,
          `❌ *Tawaran biaya tidak disetujui.*${noteMsg}\n\n📦 *${flr.title}*\n💳 Biaya tetap: *Rp ${Number(pmtR?.amount || 0).toLocaleString("id-ID")}*\n\nSilakan bayar sesuai tagihan awal.`
        ).catch(() => {});
        break;
      }

      default:
        return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    }

    // Audit trail — non-blocking
    (async () => {
      try {
        await supa.from("admin_logs").insert({
          action,
          target_id: id ? String(id) : (wa ? String(wa) : null),
          details: Object.fromEntries(
            Object.entries(body).filter(([k]) => !["action", "id", "wa", "password"].includes(k))
          ),
        });
      } catch (_) {}
    })();

    return NextResponse.json(warning ? { ok: true, warning } : { ok: true });
  } catch (e) {
    logError("/api/admin/action", e).catch(() => {});
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

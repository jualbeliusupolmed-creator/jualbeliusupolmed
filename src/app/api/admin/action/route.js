import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

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
          const { postToGroup } = await import("@/lib/fonnte");
          postToGroup(listingInfo).catch((e) => console.warn("[activate] Broadcast failed:", e?.message));
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
        await supa.from("payments").update({ status }).eq("id", id);
        break;
      }
      case "delete_payment":
        await supa.from("payments").delete().eq("id", id);
        break;

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
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isListingAvailable } from "@/lib/listingAvailability";

export const dynamic = "force-dynamic";

function normalisasiNomorWa(wa) {
  if (!wa || typeof wa !== "string") return null;
  const digits = wa.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export async function GET(request, { params }) {
  try {
    const listingId = params?.id;
    if (!listingId) {
      return NextResponse.redirect(new URL("/jual-beli", request.url), { status: 307 });
    }

    // Rate limiting: cegah crawler/bot memanen atau membombardir redirect WA
    const ip = getClientIp(request);
    const limiter = rateLimit(`chat-wa-redir:${ip}`, { limit: 30, windowMs: 60_000 });
    if (!limiter.ok) {
      return new NextResponse("Terlalu banyak permintaan kontak. Coba lagi dalam beberapa saat.", {
        status: 429,
        headers: { "Retry-After": String(limiter.retryAfter || 60) },
      });
    }

    const supa = getAdminClient();
    const { data: listing, error } = await supa
      .from("listings")
      .select("id, title, seller_wa, seller_name, status, is_sold, is_hidden, listing_code")
      .eq("id", listingId)
      .maybeSingle();

    if (error || !listing) {
      return NextResponse.redirect(new URL("/jual-beli?pesan=Barang+tidak+ditemukan", request.url), {
        status: 307,
      });
    }

    if (!isListingAvailable(listing)) {
      return NextResponse.redirect(
        new URL("/jual-beli?pesan=Barang+sudah+terjual+atau+tidak+tersedia", request.url),
        { status: 307 }
      );
    }

    const normalizedWa = normalisasiNomorWa(listing.seller_wa);
    if (!normalizedWa || normalizedWa.length < 10) {
      return NextResponse.redirect(
        new URL(`/produk/${listing.id}?error=Kontak+penjual+tidak+valid`, request.url),
        { status: 307 }
      );
    }

    // Ambil opsi titik COD jika ada dalam query param
    const { searchParams } = new URL(request.url);
    const codSpot = searchParams.get("cod")?.trim();

    let pesanText = `Halo ${listing.seller_name || "Kak"}, saya tertarik dengan barang "${listing.title}" di Kampus Kita (Kode: #${listing.listing_code || listing.id.slice(0, 8)}).`;
    if (codSpot) {
      pesanText += `\nBisa janjian COD di ${codSpot}? Terima kasih!`;
    } else {
      pesanText += ` Apakah masih tersedia?`;
    }

    // Catat kontak pembeli secara anonim/aman ke log prospek tanpa membocorkan nomor ke publik
    try {
      await supa.from("buyer_contacts").insert({
        listing_id: listing.id,
        listing_code: listing.listing_code || null,
        listing_title: listing.title,
        seller_wa: normalizedWa,
        seller_name: listing.seller_name || "Penjual",
        deal_status: "pending",
      });
    } catch (e) {
      // Gagal logging tidak boleh menggagalkan redirect kontak
      console.warn("[chat-wa] Log prospek kontak gagal dicatat:", e?.message || e);
    }

    const targetWaUrl = `https://wa.me/${normalizedWa}?text=${encodeURIComponent(pesanText)}`;
    return NextResponse.redirect(targetWaUrl, { status: 307 });
  } catch (err) {
    console.error("GET /chat-wa/[id] error:", err);
    return NextResponse.redirect(new URL("/jual-beli", request.url), { status: 307 });
  }
}


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
  return contactListing(request, params, null, false);
}

export async function POST(request, { params }) {
  const form = await request.formData().catch(() => null);
  const message = typeof form?.get("message") === "string" ? form.get("message") : "";
  return contactListing(request, params, message, true);
}

async function contactListing(request, params, requestedMessage, isPost) {
  try {
    const routeParams = await params;
    const listingId = routeParams?.id;
    if (!listingId) {
      return new NextResponse("Tautan produk tidak valid. Buka kembali produk dari marketplace.", { status: 400 });
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
      .select("id, title, seller_wa, seller_name, status, stock, listing_code")
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      console.error("[chat-wa] Listing lookup failed:", error.code || "unknown database error");
      return new NextResponse("Kontak penjual sementara tidak dapat dibuka. Coba lagi nanti.", {
        status: 503,
      });
    }

    if (!listing) {
      return new NextResponse("Produk tidak ditemukan atau sudah tidak tersedia.", { status: 404 });
    }

    if (!isListingAvailable(listing)) {
      return new NextResponse("Produk ini sudah terjual atau tidak tersedia. Buka halaman produk untuk melihat statusnya.", { status: 410 });
    }

    const normalizedWa = normalisasiNomorWa(listing.seller_wa);
    if (!normalizedWa || normalizedWa.length < 10) {
      return new NextResponse("Kontak WhatsApp penjual belum valid. Silakan gunakan obrolan dalam aplikasi atau laporkan produk ini.", { status: 409 });
    }

    // Ambil opsi titik COD jika ada dalam query param
    const { searchParams } = new URL(request.url);
    const codSpot = searchParams.get("cod")?.trim();

    const defaultMessage = `Halo ${listing.seller_name || "Kak"}, saya tertarik dengan barang "${listing.title}" di Kampus Kita (Kode: #${listing.listing_code || listing.id.slice(0, 8)}).`;
    let pesanText = String(requestedMessage || defaultMessage).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 1000) || defaultMessage;
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
    const redirect = NextResponse.redirect(targetWaUrl, { status: isPost ? 303 : 302 });
    redirect.headers.set("Referrer-Policy", "no-referrer");
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  } catch (err) {
    console.error("/chat-wa/[id] failed:", err?.code || "unexpected_error");
    return new NextResponse("WhatsApp belum dapat dibuka. Coba lagi sebentar, atau buka halaman produk untuk menghubungi penjual.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

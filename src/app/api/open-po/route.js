import { NextResponse } from "next/server";
import { fetchOpenPoBatches } from "@/lib/openPo";
import { getSellerSession } from "@/lib/auth";
import { formatWa } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, isAllowedCampus } from "@/lib/settings";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const batches = await fetchOpenPoBatches();
    return NextResponse.json({ success: true, source: "main-project", realCount: batches.length, batches }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, batches: [], error: "Open PO sedang tidak tersedia." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(req) {
  const sessionWa = getSellerSession();
  const sellerWa = formatWa(sessionWa || "");
  if (!sellerWa) return NextResponse.json({ error: "Masuk dengan akun JB untuk membuka batch PO." }, { status: 401 });
  const limit = rateLimit(`open-po-create:${sellerWa}`, { limit: 8, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return NextResponse.json({ error: "Batas pembuatan batch tercapai. Coba lagi nanti." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 100);
  const title = String(body.title || "").trim().slice(0, 120);
  const description = String(body.description || "").trim().slice(0, 2000);
  const category = String(body.category || "Lainnya").trim().slice(0, 40);
  const unit = String(body.unit || "pcs").trim().slice(0, 30);
  const campus = String(body.campus || "").trim().slice(0, 80);
  const pickupPoint = String(body.pickupPoint || "").trim().slice(0, 180);
  const pickupNote = String(body.pickupNote || "").trim().slice(0, 500);
  const price = Number(body.price);
  const quota = Number(body.quota);
  const closesAt = new Date(body.closesAt);
  const imageUrl = String(body.imageUrl || "").trim().slice(0, 1000);

  if (name.length < 2 || title.length < 2) return NextResponse.json({ error: "Nama produk dan judul batch wajib diisi." }, { status: 400 });
  if (!Number.isSafeInteger(price) || price < 0 || price > 100_000_000) return NextResponse.json({ error: "Harga harus berupa angka rupiah yang valid." }, { status: 400 });
  if (!Number.isSafeInteger(quota) || quota < 1 || quota > 100_000) return NextResponse.json({ error: "Kuota harus lebih dari nol." }, { status: 400 });
  if (Number.isNaN(closesAt.getTime()) || closesAt <= new Date() || closesAt > new Date(Date.now() + 180 * 864e5)) return NextResponse.json({ error: "Waktu tutup harus antara sekarang dan 180 hari ke depan." }, { status: 400 });
  if (pickupPoint.length < 2) return NextResponse.json({ error: "Titik pengambilan wajib diisi." }, { status: 400 });
  if (!/^https:\/\//i.test(imageUrl) && imageUrl && !imageUrl.startsWith("/")) return NextResponse.json({ error: "Foto harus memakai URL HTTPS atau path gambar situs." }, { status: 400 });

  const settings = await getSettings();
  if (!isAllowedCampus(campus, settings)) return NextResponse.json({ error: "Pilih kampus aktif dari daftar." }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("create_open_po_batch", {
    p_seller_wa: sellerWa,
    p_name: name,
    p_description: description,
    p_category: category,
    p_unit: unit,
    p_image_url: imageUrl || null,
    p_campus: campus,
    p_title: title,
    p_price_idr: price,
    p_quota: quota,
    p_closes_at: closesAt.toISOString(),
    p_pickup_point: pickupPoint,
    p_pickup_note: pickupNote,
    p_seller_contact_consent: body.shareContact === true,
  });
  if (error) {
    console.error("[open-po] Batch creation failed:", error.code || "database_error");
    return NextResponse.json({ error: "Batch gagal dibuat. Periksa isian dan kesiapan migrasi PO." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, id: data }, { status: 201 });
}

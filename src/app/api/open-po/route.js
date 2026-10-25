import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OPEN_PO_SUPABASE_URL = "https://endvossmhulujxexssfp.supabase.co";
const OPEN_PO_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZHZvc3NtaHVsdWp4ZXhzc2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MTUyNDIsImV4cCI6MjEwODE5MTI0Mn0.Mj15CDJVO06DsExL2LV3gePWKcFfBr47o4IU6DLMGz0";

// Fallback template items bila database Open PO belum memiliki batch aktif lain
const FALLBACK_PO_ITEMS = [
  {
    id: "sample-1",
    title: "Batch PO Risol Mayo Lumer Mba Siti",
    name: "Risol Mayo Spesial",
    category: "Makanan",
    price: 12000,
    quota: 30,
    reserved: 24,
    closes_at: new Date(Date.now() + 86400000).toISOString(),
    pickup_point: "Pintu 2 USU & Parkiran FIB",
    pickup_note: "Digoreng hangat saat jam pickup. Isi 3 pcs mayo lumer.",
    seller_name: "Nadia Putri",
    faculty: "Fakultas Pertanian",
    photo: "/images/risol-mayo.jpg",
    emoji: "🥟",
    status: "open",
    url: "https://open-po.vercel.app/po/sample-1?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed",
  },
  {
    id: "sample-2",
    title: "Batch PO Kopi Susu Aren 1L & Cup",
    name: "Kopi Susu Gula Aren",
    category: "Minuman",
    price: 10000,
    quota: 25,
    reserved: 18,
    closes_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    pickup_point: "Kantin Gedung Z POLMED & USU",
    pickup_note: "Dingin & fresh espresso blend robusta-arabika.",
    seller_name: "Rafi Maulana",
    faculty: "Fakultas Teknik",
    photo: "/images/kopi-susu.jpg",
    emoji: "☕",
    status: "open",
    url: "https://open-po.vercel.app/po/sample-2?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed",
  },
  {
    id: "sample-matcha",
    title: "Batch Cold Brew Matcha Oat Latte",
    name: "Cold Brew Matcha Latte",
    category: "Minuman",
    price: 18000,
    quota: 20,
    reserved: 15,
    closes_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    pickup_point: "Selasar FIB USU",
    pickup_note: "Matcha murni dengan oat milk creamy.",
    seller_name: "Ahmad Zaki",
    faculty: "Fakultas Ilmu Budaya",
    photo: "/images/matcha-latte.jpg",
    emoji: "🍵",
    status: "open",
    url: "https://open-po.vercel.app?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed",
  },
];

function resolvePhoto(name = "") {
  const n = name.toLowerCase();
  if (n.includes("kaos") || n.includes("baju")) return "/images/kaos-angkatan.jpg";
  if (n.includes("brownies") || n.includes("cokelat")) return "/images/brownies.jpg";
  if (n.includes("risol")) return "/images/risol-mayo.jpg";
  if (n.includes("matcha")) return "/images/matcha-latte.jpg";
  if (n.includes("kopi")) return "/images/kopi-susu.jpg";
  if (n.includes("dimsum")) return "/images/dimsum.png";
  if (n.includes("buket") || n.includes("bunga")) return "/images/bouquet.png";
  if (n.includes("charm") || n.includes("manik")) return "/images/phone-charm.png";
  if (n.includes("tote") || n.includes("bag")) return "/images/tote-bag.png";
  return "/images/kopi-susu.jpg";
}

function resolveEmoji(cat = "") {
  const c = cat.toLowerCase();
  if (c.includes("minum")) return "🍵";
  if (c.includes("makan")) return "🍫";
  if (c.includes("fash")) return "👕";
  if (c.includes("kera")) return "💐";
  return "🛍️";
}

export async function GET() {
  try {
    const query = new URLSearchParams({
      select:
        "id,title,quota,reserved_quantity,closes_at,pickup_at,pickup_point,pickup_note,status," +
        "product:po_products(id,name,description,category,price_idr," +
        "seller:po_sellers(display_name,faculty,avatar_path))",
      status: "eq.open",
      order: "closes_at.asc",
    });

    const res = await fetch(`${OPEN_PO_SUPABASE_URL}/rest/v1/po_batches?${query.toString()}`, {
      headers: {
        apikey: OPEN_PO_ANON_KEY,
        Authorization: `Bearer ${OPEN_PO_ANON_KEY}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({
        success: true,
        source: "fallback",
        batches: FALLBACK_PO_ITEMS,
      });
    }

    const rawBatches = await res.json();

    const realBatches = (rawBatches || []).map((b) => {
      const prod = b.product || {};
      const seller = prod.seller || {};
      const prodName = prod.name || b.title;
      return {
        id: b.id,
        title: b.title,
        name: prodName,
        category: prod.category || "Kampus",
        price: prod.price_idr || 0,
        quota: b.quota || 0,
        reserved: b.reserved_quantity || 0,
        closes_at: b.closes_at,
        pickup_at: b.pickup_at,
        pickup_point: b.pickup_point || "Area Kampus",
        pickup_note: b.pickup_note || "",
        seller_name: seller.display_name || "Mahasiswa",
        faculty: seller.faculty || "USU - POLMED",
        photo: resolvePhoto(prodName),
        emoji: resolveEmoji(prod.category || ""),
        status: b.status,
        url: `https://open-po.vercel.app/po/${b.id}?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed`,
      };
    });

    // Kembalikan data batch real dari OpenPO
    const batchesToReturn = realBatches.length > 0 ? realBatches : FALLBACK_PO_ITEMS;

    return NextResponse.json({
      success: true,
      source: realBatches.length > 0 ? "realtime" : "fallback",
      realCount: realBatches.length,
      batches: batchesToReturn,
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      source: "fallback",
      batches: FALLBACK_PO_ITEMS,
      error: err.message,
    });
  }
}

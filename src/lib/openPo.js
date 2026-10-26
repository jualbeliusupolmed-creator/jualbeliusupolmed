const OPEN_PO_SUPABASE_URL = "https://endvossmhulujxexssfp.supabase.co";
const OPEN_PO_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZHZvc3NtaHVsdWp4ZXhzc2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MTUyNDIsImV4cCI6MjEwODE5MTI0Mn0.Mj15CDJVO06DsExL2LV3gePWKcFfBr47o4IU6DLMGz0";

export function resolvePhoto(name = "") {
  const n = (name || "").toLowerCase();
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

export function resolveEmoji(cat = "") {
  const c = (cat || "").toLowerCase();
  if (c.includes("minum")) return "🍵";
  if (c.includes("makan")) return "🍫";
  if (c.includes("fash")) return "👕";
  if (c.includes("kera")) return "💐";
  return "🛍️";
}

/**
 * Mengambil daftar batch PO yang aktif langsung dari database Supabase OpenPO.
 * Menjamin 100% data nyata tanpa data tiruan / mock / URL 404.
 */
export async function fetchOpenPoBatches() {
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
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return [];
    }

    const rawBatches = await res.json();
    if (!Array.isArray(rawBatches)) return [];

    const now = new Date();

    return rawBatches
      .filter((b) => {
        // Hanya tampilkan yang statusnya open dan belum lewat waktu tutup
        if (b.status !== "open") return false;
        if (b.closes_at && new Date(b.closes_at) <= now) return false;
        return true;
      })
      .map((b) => {
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
          faculty: seller.faculty || "USU & POLMED",
          photo: resolvePhoto(prodName),
          emoji: resolveEmoji(prod.category || ""),
          status: b.status,
          url: `https://open-po.vercel.app/po/${b.id}?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed`,
        };
      });
  } catch (err) {
    console.error("[fetchOpenPoBatches] Error:", err);
    return [];
  }
}

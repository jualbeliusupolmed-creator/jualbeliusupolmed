import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import { kontakDenganCadangan } from "@/lib/kontakAdmin";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

// GET /api/config -> konfigurasi publik (harga, kategori, teks situs, kontak)
// Dipakai halaman client (jual/edit) agar harga & kategori selalu ikut admin.
export async function GET() {
  try {
    const [settings, categories] = await Promise.all([
      getSettings(),
      getCategories(),
    ]);
    return NextResponse.json(
      {
        pricing: settings.pricing,
        site: settings.site,
        emergencyBanner: settings.emergencyBanner || null,
        platformLockdown: settings.platformLockdown || null,
        // Satu-satunya tempat pengalihan ini dipasang: /api/config adalah hulu
        // kontak untuk footer, dashboard, halaman jual/jasa/dicari sekaligus.
        contact: await kontakDenganCadangan(settings.contact),
        categories,
        popupAd: settings.popupAd,
        mading: settings.mading,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    return jawabGalat(e);
  }
}

import { isAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET /api/outbound-ip — IP keluar server Vercel, untuk mendaftarkannya di
// daftar-putih layanan lain. Berguna sesekali bagi pemilik, tidak berguna sama
// sekali bagi publik: yang ia serahkan adalah alamat yang dipakai situs ini
// untuk memanggil VPS dan layanan pihak ketiga. Sejak 21 Agustus 2026 ia
// bergerbang admin, sama seperti rute operasional lainnya.
export async function GET() {
  if (!isAdmin()) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();

    return Response.json({
      pesan: "Ini adalah IP Outbound server Vercel Anda saat ini:",
      ip_outbound: data.ip
    });
  } catch (error) {
    console.error("[outbound-ip]", error?.stack || error);
    return Response.json({ error: "Gagal mengambil IP keluar." }, { status: 500 });
  }
}

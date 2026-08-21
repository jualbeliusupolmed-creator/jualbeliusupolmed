import { NextResponse } from "next/server";
import { paymentsDemo } from "@/lib/demoData";

export const dynamic = "force-dynamic";

/*
 * Kembaran /api/admin/keuangan untuk salinan demo — TANPA gerbang, dan itu
 * disengaja: seluruh /admin-demo memang terbuka.
 *
 * Yang membuatnya aman bukan gerbangnya, melainkan sumbernya: berkas ini tidak
 * pernah menyentuh klien database. Ia mengembalikan angka karangan dari
 * src/lib/demoData.js, jadi tidak ada jalan dari sini menuju satu baris pun
 * data sungguhan — bahkan kalau seseorang menemukan alamatnya.
 */
export async function GET() {
  return NextResponse.json({ payments: paymentsDemo.filter((p) => p.status === "paid") });
}

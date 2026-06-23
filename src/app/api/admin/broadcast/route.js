import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, imageUrl } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    const supa = getAdminClient();
    const { data: sellers, error } = await supa.from("seller_profiles").select("wa");
    
    if (error || !sellers) {
      return NextResponse.json({ error: "Gagal mengambil data penjual" }, { status: 500 });
    }

    let successCount = 0;
    let failCount = 0;

    // We process the broadcasts sequentially or in chunks to not overwhelm Fonnte
    for (const seller of sellers) {
      try {
        const msg = imageUrl 
          ? { text: message, file: imageUrl }
          : message;
          
        await sendWa(seller.wa, msg);
        successCount++;
        // Adding a small delay to prevent rate-limiting or blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        failCount++;
      }
    }

    return NextResponse.json({ successCount, failCount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function namaAman(value) {
  if (typeof value !== "string") return "";
  return censorProfanity(value.trim().replace(/\s+/g, " ")).slice(0, 30);
}

export async function GET() {
  const wa = getUserSession();
  if (!wa) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  const { data, error } = await getAdminClient()
    .from("seller_profiles")
    .select("anonymous_name")
    .eq("wa", wa)
    .maybeSingle();

  if (error && !/anonymous_name/i.test(error.message || "")) {
    return NextResponse.json({ error: "Gagal memuat nama anonim." }, { status: 500 });
  }

  return NextResponse.json({ anonymousName: data?.anonymous_name || "Anonim" });
}

export async function PUT(request) {
  const wa = getUserSession();
  if (!wa) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  const laju = rateLimit(`anonymous-name:${getClientIp(request)}:${wa}`, { limit: 5, windowMs: 10 * 60_000 });
  if (!laju.ok) {
    return NextResponse.json({ error: `Terlalu sering mengubah nama. Coba lagi dalam ${laju.retryAfter} detik.` }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const anonymousName = namaAman(body.anonymousName);
  if (anonymousName.length < 2) {
    return NextResponse.json({ error: "Nama anonim minimal 2 karakter." }, { status: 400 });
  }

  const supa = getAdminClient();
  const { data: existing, error: readError } = await supa
    .from("seller_profiles")
    .select("wa")
    .eq("wa", wa)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: "Gagal menyimpan nama anonim." }, { status: 500 });

  const query = existing
    ? supa.from("seller_profiles").update({ anonymous_name: anonymousName }).eq("wa", wa)
    : supa.from("seller_profiles").insert({ wa, name: "Pengguna", anonymous_name: anonymousName });
  const { error } = await query;

  if (error) {
    if (/anonymous_name/i.test(error.message || "")) {
      return NextResponse.json({ error: "Fitur nama anonim belum diaktifkan di database." }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menyimpan nama anonim." }, { status: 500 });
  }

  return NextResponse.json({ success: true, anonymousName });
}

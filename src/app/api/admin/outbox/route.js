import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa } from "@/lib/fonnte";
import { tokenBotSah } from "@/lib/botTokens";

export const dynamic = "force-dynamic";

/*
 * Antrean notifikasi WhatsApp yang belum sampai.
 *
 * Diisi src/lib/fonnte.js saat pengiriman gagal total, dibaca dua panel:
 * panel admin situs, dan dashboard bot di bot.jualbeliusupolmed.web.id yang
 * memanggil rute ini lewat proxy karena VPS tidak punya kredensial Supabase.
 *
 * Karena itu penjaganya menerima DUA identitas: cookie admin situs, atau token
 * bot — token yang sama yang sudah dipakai bot untuk menembak webhook.
 */
function boleh(req) {
  if (isAdmin()) return true;
  // Token perangkat MANA PUN yang terdaftar — sejak 22 Agu 2026 ada dua bot, dan
  // keduanya memakai proxy antrean ini. tokenBotSah() sudah fail-closed sendiri
  // kalau BAILEYS_API_TOKEN kosong, dan sudah menerima bentuk "Bearer <token>".
  return tokenBotSah(req.headers.get("authorization"));
}

// Supabase menjawab tabel yang belum ada dengan galat schema-cache yang tidak
// berarti apa-apa bagi pembacanya. Terjemahkan jadi satu kalimat yang menyebut
// apa yang harus dilakukan.
function belumMigrasi(e) {
  return /wa_outbox/i.test(e?.message || "") &&
         /does not exist|schema cache|relation/i.test(e?.message || "");
}
function jawabGalat(e) {
  if (belumMigrasi(e)) {
    return NextResponse.json({
      error: "Tabel wa_outbox belum ada — jalankan migrasi (BAGIAN 24) di Supabase dulu.",
      belumAda: true,
    }, { status: 503 });
  }
  return NextResponse.json({ error: e?.message || "Gagal" }, { status: 500 });
}

// GET /api/admin/outbox?status=tertunda&limit=100
export async function GET(req) {
  if (!boleh(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "tertunda";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 300);

  try {
    const supa = getAdminClient();
    let q = supa.from("wa_outbox").select("*").order("created_at", { ascending: false }).limit(limit);
    if (status !== "semua") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;

    // Hitungan per status dipakai lencana di kedua panel. head:true supaya yang
    // dibawa cuma angkanya, bukan seluruh barisnya lagi.
    const { count: tertunda } = await supa
      .from("wa_outbox").select("id", { count: "exact", head: true }).eq("status", "tertunda");

    return NextResponse.json({ ok: true, tertunda: tertunda || 0, items: data || [] });
  } catch (e) {
    return jawabGalat(e);
  }
}

// POST /api/admin/outbox  { id }  atau  { semua: true }  atau  { batal: id }
export async function POST(req) {
  if (!boleh(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const supa = getAdminClient();

  if (body.batal) {
    const { error } = await supa
      .from("wa_outbox").update({ status: "dibatalkan" }).eq("id", body.batal).eq("status", "tertunda");
    if (error) return jawabGalat(error);
    return NextResponse.json({ ok: true, dibatalkan: 1 });
  }

  if (body.manual || body.tandai_manual) {
    const targetId = body.manual || body.tandai_manual;
    const { error } = await supa
      .from("wa_outbox")
      .update({
        status: "terkirim",
        terkirim_at: new Date().toISOString(),
        galat_terakhir: "Dikirim manual oleh admin via WA Web/App",
      })
      .eq("id", targetId)
      .eq("status", "tertunda");
    if (error) return jawabGalat(error);
    return NextResponse.json({ ok: true, manual: 1, terkirim: 1 });
  }

  let antre = [];
  try {
    let q = supa.from("wa_outbox").select("*").eq("status", "tertunda").order("created_at", { ascending: true });
    // Sengaja dibatasi 50 per penekanan. Menyemburkan ratusan pesan sekaligus ke
    // WhatsApp adalah pola yang membuat nomor dibatasi — persis bencana yang
    // menciptakan antrean ini. Sisanya tinggal tekan lagi.
    //
    // "Kirim semua" juga sengaja MELEWATI grup dan saluran. Kegagalan ke grup
    // ikut ditampung supaya kehilangannya terlihat, tapi pengumuman ke grup
    // punya masa berlaku: iklan yang diumumkan tiga hari terlambat membuat
    // grupnya berisik tanpa menolong siapa pun. Barisnya tetap bisa dikirim
    // satu per satu — dengan seorang manusia yang melihat umurnya dulu.
    q = body.semua
      ? (body.termasukGrup ? q : q.not("target", "like", "%@g.us").not("target", "like", "%@newsletter")).limit(50)
      : q.eq("id", body.id).limit(1);
    const { data, error } = await q;
    if (error) throw error;
    antre = data || [];
  } catch (e) {
    return jawabGalat(e);
  }

  if (!antre.length) return NextResponse.json({ ok: true, terkirim: 0, gagal: 0, sisa: 0 });

  let terkirim = 0, gagal = 0;
  const alasan = [];

  for (const row of antre) {
    // jangan_tampung: barisnya sudah ada. Tanpa ini tiap penekanan tombol saat
    // bot masih mati akan menambah baris baru untuk pesan yang sama.
    const hasil = await sendWa(row.target, row.message, row.image_url || null, row.ttl_detik || null, {
      jangan_tampung: true,
    }).catch((e) => ({ ok: false, error: e?.message }));

    if (hasil?.ok) {
      terkirim++;
      await supa.from("wa_outbox").update({
        status: "terkirim",
        terkirim_at: new Date().toISOString(),
        percobaan: (row.percobaan || 0) + 1,
        galat_terakhir: null,
      }).eq("id", row.id);
    } else {
      gagal++;
      const sebab = hasil?.galat || hasil?.error || hasil?.data?.error || "bot masih belum bisa menerima";
      if (!alasan.includes(sebab)) alasan.push(sebab);
      // Tetap 'tertunda' — tombolnya memang untuk ditekan lagi nanti.
      await supa.from("wa_outbox").update({
        percobaan: (row.percobaan || 0) + 1,
        galat_terakhir: String(sebab).slice(0, 500),
      }).eq("id", row.id);
    }
  }

  const { count: sisa } = await supa
    .from("wa_outbox").select("id", { count: "exact", head: true }).eq("status", "tertunda");

  return NextResponse.json({ ok: true, terkirim, gagal, sisa: sisa || 0, alasan });
}

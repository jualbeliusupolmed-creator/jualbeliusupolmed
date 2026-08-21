import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { formatWaForBaileys } from "@/lib/constants";
import {
  postToGroup,
  notifyAdminNewListing,
  notifySellerListingLive,
  pesanGrupIklan,
  pesanPenjualTayang,
  pesanAdminIklan,
  daftarGrup,
  nomorAdmin,
  urlProduk,
} from "@/lib/fonnte";

/*
 * Satu iklan, dua cara mengabarkannya — dan SATU sumber kata-katanya.
 *
 *   mode "bot"  → bot yang mengirim: grup (semua grup tujuan), admin, penjual.
 *                 Dipakai kalau bot hidup. Jawabannya menyebut per tujuan
 *                 berhasil atau tidak, bukan "berhasil" gelondongan — karena
 *                 "terkirim" yang ternyata cuma sampai ke satu dari tiga grup
 *                 adalah jenis kabar baik yang paling merugikan.
 *
 *   mode "teks" → tidak mengirim apa pun. Mengembalikan teks jadi + tautan
 *                 wa.me supaya admin bisa mengirim sendiri lewat WhatsApp-nya.
 *                 Ini jalan keluar saat bot mati: iklan tetap sampai ke grup dan
 *                 penjual, cuma tangannya manusia.
 *
 * Keduanya memakai builder yang sama di src/lib/fonnte.js. Kalau masing-masing
 * menyusun kalimatnya sendiri, keduanya akan pelan-pelan berbeda — dan yang
 * manual justru dipakai saat tidak ada seorang pun yang sedang membandingkan.
 */

export const dynamic = "force-dynamic";

const LISTING_FIELDS =
  "id, title, description, price, category, type, rental_period, status, image_url, " +
  "seller_name, seller_wa, listing_code, expires_at, campus";

/** wa.me untuk satu nomor, lengkap dengan teksnya. */
function tautanNomor(nomor, teks) {
  const wa = formatWaForBaileys(nomor);
  if (!wa) return null;
  return `https://wa.me/${wa}?text=${encodeURIComponent(teks)}`;
}

export async function POST(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, mode = "bot" } = await req.json();
    if (!id) return NextResponse.json({ error: "id listing wajib diisi" }, { status: 400 });

    const supa = getAdminClient();
    const { data: listing, error } = await supa
      .from("listings")
      .select(LISTING_FIELDS)
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!listing) return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });

    const settings = await getSettings().catch(() => null);
    const admin = settings?.admin || {};

    const teksGrup = pesanGrupIklan(listing);
    const teksPenjual = pesanPenjualTayang(listing);
    const teksAdmin = pesanAdminIklan(listing);

    // ── Mode teks: siapkan bahan, jangan kirim apa pun ────────────────────
    if (mode === "teks") {
      const grupJid = daftarGrup(admin);
      return NextResponse.json({
        ok: true,
        mode: "teks",
        judul: listing.title,
        gambar: listing.image_url || null,
        url: urlProduk(listing),
        grup: {
          teks: teksGrup,
          jid: grupJid,
          // WhatsApp tidak punya tautan "kirim ke grup ini" — JID bukan alamat
          // yang bisa dibuka peramban. Yang ada cuma dua: pemilih chat bawaan
          // WhatsApp (teks sudah terisi, tinggal pilih grupnya), dan tautan
          // undangan grup dari Pengaturan untuk membuka grupnya langsung.
          tautanPilihChat: `https://wa.me/?text=${encodeURIComponent(teksGrup)}`,
          tautanGrup: settings?.contact?.waGroupLink || null,
        },
        penjual: {
          nama: listing.seller_name || null,
          wa: listing.seller_wa || null,
          teks: teksPenjual,
          tautan: listing.seller_wa ? tautanNomor(listing.seller_wa, teksPenjual) : null,
        },
        admin: {
          wa: nomorAdmin(admin.adminWa) || null,
          teks: teksAdmin,
          tautan: nomorAdmin(admin.adminWa) ? tautanNomor(nomorAdmin(admin.adminWa), teksAdmin) : null,
        },
      });
    }

    // ── Mode bot: kirim tiga-tiganya, laporkan apa adanya ─────────────────
    const [grupRes, adminRes, penjualRes] = await Promise.allSettled([
      postToGroup(listing, admin),
      notifyAdminNewListing(listing, admin.adminWa),
      notifySellerListingLive(listing),
    ]);

    const nilai = (r) => (r.status === "fulfilled" ? (r.value || {}) : { ok: false, error: r.reason?.message });

    const grup = nilai(grupRes);
    const adm = nilai(adminRes);
    const penjual = nilai(penjualRes);

    const hasil = [
      {
        tujuan: "Grup WA",
        ok: !!grup.ok,
        detail: grup.skipped
          ? "Tidak ada grup tujuan — isi Group JID di Pengaturan."
          : `${grup.terkirim || 0}/${(grup.terkirim || 0) + (grup.gagal || 0)} grup`,
        error: grup.ok ? null : grup.error || null,
      },
      {
        tujuan: "Admin",
        ok: !!adm.ok,
        detail: adm.skipped ? "Nomor admin belum di-set." : (adm.ditampung ? "gagal — ditampung di antrean" : ""),
        error: adm.ok ? null : adm.error || adm.galat || null,
      },
      {
        tujuan: "Penjual",
        ok: !!penjual.ok,
        detail: penjual.skipped ? "Penjual tidak punya nomor WA." : (penjual.ditampung ? "gagal — ditampung di antrean" : ""),
        error: penjual.ok ? null : penjual.error || penjual.galat || null,
      },
    ];

    const berhasil = hasil.filter((h) => h.ok).length;
    return NextResponse.json({
      ok: berhasil === hasil.length,
      mode: "bot",
      berhasil,
      total: hasil.length,
      hasil,
      // Kalimat siap pakai untuk toast — supaya panel tidak perlu merangkai
      // sendiri dan berisiko menyebut "berhasil" untuk kiriman yang separuh.
      ringkas:
        berhasil === hasil.length
          ? `Terkirim ke grup, admin, dan penjual.`
          : `${berhasil}/${hasil.length} tujuan berhasil — ` +
            hasil.filter((h) => !h.ok).map((h) => `${h.tujuan}: ${h.error || h.detail || "gagal"}`).join("; "),
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Gagal memproses" }, { status: 500 });
  }
}

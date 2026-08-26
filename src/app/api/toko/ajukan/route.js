import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatWaForBaileys } from "@/lib/constants";
import { namaToko, statusToko } from "@/lib/toko";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

/*
 * POST /api/toko/ajukan — penjual meminta tokonya diaktifkan admin.
 *
 * Yang dikembalikan bukan cuma "ok": ia menyiapkan TAUTAN WHATSAPP ke admin,
 * lengkap dengan isi pesannya dan satu tautan persetujuan di dalamnya.
 *
 * Kenapa tautan persetujuannya mengarah ke /admin/approve-toko dan BUKAN ke
 * sebuah token sakti yang langsung mengaktifkan:
 *
 *   Pesan ini mendarat di chat WhatsApp — dan chat diteruskan, dikutip,
 *   dan dibaca orang lain. Tautan yang langsung mengaktifkan sesuatu hanya
 *   dengan dibuka adalah kunci yang menganggur di dalam percakapan; siapa pun
 *   yang meneruskan pesannya ikut menyerahkan kuncinya. Yang dikirim di sini
 *   cuma ALAMAT halaman panel. Membukanya tetap menuntut admin sudah masuk
 *   panel, dan mengaktifkan tetap menuntut satu tombol ditekan dengan sadar.
 *
 * Penjual boleh menekan tombol ini berkali-kali (pesannya bisa hilang di chat).
 * Yang berubah hanya `store_requested_at`; statusnya tidak pernah mundur dari
 * 'aktif' — toko yang sudah hidup tidak boleh jatuh kembali ke antrean karena
 * satu ketukan tidak sengaja.
 */
export async function POST() {
  const wa = getSellerSession();
  if (!wa) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const supa = getAdminClient();
  const { data: profil, error } = await supa
    .from("seller_profiles")
    .select("*")
    .eq("wa", wa)
    .maybeSingle();

  if (error) return jawabGalat(error);
  if (!profil) return NextResponse.json({ error: "Simpan tokomu dulu sebelum diajukan." }, { status: 400 });
  if (!profil.slug) {
    return NextResponse.json({ error: "Isi alamat toko (/toko/…) dulu, lalu simpan." }, { status: 400 });
  }
  if (!profil.store_name) {
    return NextResponse.json({ error: "Nama toko wajib diisi sebelum diajukan." }, { status: 400 });
  }

  const status = statusToko(profil);
  const sudahAktif = status === "aktif";

  if (!sudahAktif) {
    const { error: galat } = await supa
      .from("seller_profiles")
      .update({
        store_status: "menunggu",
        store_requested_at: new Date().toISOString(),
        store_reject_note: null,
      })
      .eq("wa", wa);

    // Kolomnya belum ada = migrasi BAGIAN 26 belum dijalankan. Sebutkan apa
    // yang harus dilakukan; "gagal menyimpan" tidak memberi tahu siapa pun apa
    // pun.
    if (galat) {
      const belumMigrasi = /store_status|column .* does not exist|schema cache/i.test(galat.message || "");
      return NextResponse.json({
        error: belumMigrasi
          ? "Fitur persetujuan toko belum aktif di database — jalankan migrasi BAGIAN 26 dulu."
          : galat.message,
      }, { status: 500 });
    }
  }

  const settings = await getSettings().catch(() => null);
  const dasar = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const nomorAdmin =
    formatWaForBaileys(settings?.admin?.adminWa || "") ||
    formatWaForBaileys(process.env.ADMIN_WA || "") ||
    formatWaForBaileys(settings?.contact?.marketplaceWa || "");

  const nama = namaToko(profil);
  const tautanPersetujuan = `${dasar}/admin/approve-toko?wa=${encodeURIComponent(profil.wa)}`;

  const pesan =
    `🏪 *Permohonan Aktivasi Toko*\n\n` +
    `Halo Admin, saya ingin mengaktifkan toko saya di Jual Beli USU Polmed.\n\n` +
    `📛 Nama toko: *${nama}*\n` +
    `🔗 Alamat: ${dasar}/toko/${profil.slug}\n` +
    `👤 Penjual: ${profil.name || "-"}\n` +
    `📱 WhatsApp: ${profil.wa}\n` +
    (profil.store_area ? `📍 Wilayah: ${profil.store_area}\n` : "") +
    (profil.tagline ? `📝 ${profil.tagline}\n` : "") +
    `\nMohon diaktifkan ya, terima kasih 🙏\n\n` +
    `— Aktifkan lewat panel admin:\n${tautanPersetujuan}`;

  return NextResponse.json({
    ok: true,
    status: sudahAktif ? "aktif" : "menunggu",
    sudahAktif,
    nomorAdmin: nomorAdmin || null,
    pesan,
    tautanPersetujuan,
    // Tanpa nomor admin, tombolnya tidak boleh mengarah ke wa.me kosong —
    // halaman yang memanggil ini menyalin teksnya saja.
    waLink: nomorAdmin ? `https://wa.me/${nomorAdmin}?text=${encodeURIComponent(pesan)}` : null,
  });
}

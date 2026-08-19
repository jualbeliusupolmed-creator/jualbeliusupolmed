import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWaForBaileys } from "@/lib/constants";
import { AKSEN, aksenAman, namaToko } from "@/lib/toko";
import ProductCard from "@/components/ProductCard";
import ShareProfileButton from "@/components/ShareProfileButton";

export const revalidate = 300; // ISR 5 menit, sama dengan halaman penjual

async function ambilToko(slug) {
  try {
    const supa = getAdminClient();

    // ilike, bukan eq: penjual menyebarkan alamat tokonya lewat mulut ke mulut
    // dan tulisan tangan, jadi /toko/Warung-Ridho harus mendarat di tempat yang
    // sama dengan /toko/warung-ridho.
    const { data: profil } = await supa
      .from("seller_profiles")
      .select("*")
      .ilike("slug", String(slug || ""))
      .maybeSingle();
    if (!profil) return null;

    const [{ data: aktif }, { data: terjual }] = await Promise.all([
      supa.from("listings").select("*").eq("seller_wa", profil.wa)
        .eq("status", "active").order("bumped_at", { ascending: false }),
      supa.from("listings").select("*").eq("seller_wa", profil.wa)
        .eq("status", "sold").order("created_at", { ascending: false }).limit(6),
    ]);

    // ProductCard membaca lencana distributor dari listing.seller_profiles,
    // dan kita sudah memegang profilnya — tempelkan daripada menyuruh setiap
    // kartu menanyakannya lagi ke basis data.
    for (const l of [...(aktif || []), ...(terjual || [])]) l.seller_profiles = profil;

    const { count: jumlahTerjual } = await supa
      .from("listings").select("id", { count: "exact", head: true })
      .eq("seller_wa", profil.wa).eq("status", "sold");

    return {
      profil,
      aktif: aktif || [],
      terjual: terjual || [],
      jumlahTerjual: jumlahTerjual || 0,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const data = await ambilToko(params.slug);
  if (!data) return { title: "Toko tidak ditemukan" };

  const { profil, aktif } = data;
  const nama = namaToko(profil);
  const dasar = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const alamat = `${dasar}/toko/${profil.slug}`;
  const gambar = profil.banner_url || profil.logo_url || aktif[0]?.image_url || null;
  const ringkas = profil.tagline
    || `${aktif.length} barang siap dibeli dari ${nama}. Pesan langsung lewat WhatsApp.`;

  return {
    title: `${nama} — Toko Online`,
    description: ringkas,
    alternates: { canonical: alamat },
    openGraph: {
      title: nama,
      description: ringkas,
      url: alamat,
      type: "website",
      ...(gambar && { images: [{ url: gambar, width: 1200, height: 630, alt: nama }] }),
    },
    twitter: {
      card: gambar ? "summary_large_image" : "summary",
      title: nama,
      description: ringkas,
      ...(gambar && { images: [gambar] }),
    },
  };
}

export default async function HalamanToko({ params }) {
  const data = await ambilToko(params.slug);
  if (!data) notFound();

  const { profil, aktif, terjual, jumlahTerjual } = data;
  const nama = namaToko(profil);
  const warna = AKSEN[aksenAman(profil.store_accent)];
  const waIntl = formatWaForBaileys(profil.wa); // "" kalau bukan nomor sungguhan
  const buka = profil.store_open !== false;
  const sapaan = `Halo ${nama}, saya lihat tokonya di jualbeliusupolmed.web.id`;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      {/* Sampul. Tanpa gambar pun tokonya tidak boleh terlihat kosong —
          gradasi warna aksen dipakai sebagai pengganti yang tetap rapi. */}
      <div
        className="relative mt-4 h-32 overflow-hidden rounded-2xl sm:h-44"
        style={
          profil.banner_url
            ? undefined
            : { backgroundImage: `linear-gradient(135deg, ${warna.utama}, ${warna.utama}88)` }
        }
      >
        {profil.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profil.banner_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="-mt-10 flex flex-col items-center px-2 text-center sm:-mt-12">
        <div
          className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-2xl font-bold shadow-md dark:border-slate-900 dark:bg-slate-900 sm:h-24 sm:w-24"
          style={{ color: warna.utama }}
        >
          {profil.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profil.logo_url} alt={nama} className="h-full w-full object-cover" />
          ) : (
            nama.slice(0, 2).toUpperCase()
          )}
        </div>

        <h1 className="mt-3 flex items-center gap-2 text-xl font-bold sm:text-2xl">
          {nama}
          {profil.trusted_seller && (
            <span title="Penjual terverifikasi" className="text-sky-500">✓</span>
          )}
        </h1>

        {profil.tagline && (
          <p className="mt-1 max-w-xl text-sm text-gray-600 dark:text-slate-400">{profil.tagline}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span
            className="rounded-full px-3 py-1 font-semibold"
            style={
              buka
                ? { background: warna.muda, color: warna.teks }
                : { background: "#f1f5f9", color: "#64748b" }
            }
          >
            {buka ? "Buka" : "Sedang tutup"}
          </span>
          {profil.store_area && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
              📍 {profil.store_area}
            </span>
          )}
          {profil.store_hours && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
              🕒 {profil.store_hours}
            </span>
          )}
          {jumlahTerjual > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
              {jumlahTerjual}× terjual
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {waIntl && (
            <a
              href={`https://wa.me/${waIntl}?text=${encodeURIComponent(sapaan)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: warna.utama }}
            >
              Chat penjual
            </a>
          )}
          {profil.store_instagram && (
            <a
              href={`https://instagram.com/${profil.store_instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline rounded-xl px-4 py-2 text-xs"
            >
              @{profil.store_instagram}
            </a>
          )}
          <ShareProfileButton />
        </div>

        {profil.store_announcement && (
          <div
            className="mt-5 w-full rounded-2xl border px-4 py-3 text-left text-sm"
            style={{ background: warna.muda, borderColor: `${warna.utama}33`, color: warna.teks }}
          >
            {profil.store_announcement}
          </div>
        )}

        {profil.bio && (
          <p className="mt-4 max-w-2xl whitespace-pre-line text-left text-sm text-gray-600 dark:text-slate-400">
            {profil.bio}
          </p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold">
          Barang di toko ini{" "}
          <span className="text-gray-400">({aktif.length})</span>
        </h2>
        {aktif.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500 dark:text-slate-400">
            Belum ada barang yang sedang dijual di sini.
            {waIntl && (
              <>
                {" "}
                <a
                  href={`https://wa.me/${waIntl}?text=${encodeURIComponent(sapaan)}`}
                  className="font-semibold underline"
                  style={{ color: warna.utama }}
                >
                  Tanya langsung ke penjualnya
                </a>
                .
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {aktif.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {terjual.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 text-base font-bold">Pernah terjual</h2>
          <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">
            Bukan untuk dibeli — ini jejak transaksi yang sudah selesai.
          </p>
          <div className="grid grid-cols-2 gap-3 opacity-70 sm:grid-cols-3 lg:grid-cols-4">
            {terjual.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-slate-700">
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Toko ini gratis dibuat di Jual Beli USU Polmed.
        </p>
        <Link
          href="/dashboard/toko"
          className="mt-2 inline-block text-sm font-semibold"
          style={{ color: warna.utama }}
        >
          Buat toko punyamu sendiri →
        </Link>
      </div>
    </div>
  );
}

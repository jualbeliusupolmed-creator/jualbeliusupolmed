import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWaForBaileys } from "@/lib/constants";
import { AKSEN, aksenAman, namaToko } from "@/lib/toko";
import ProductCard from "@/components/ProductCard";
import ShareProfileButton from "@/components/ShareProfileButton";
import TokoKatalog from "@/components/TokoKatalog";

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

/** Angka dengan labelnya — dipakai berjajar di bawah nama toko. */
function Angka({ nilai, label }) {
  return (
    <div className="min-w-[72px] px-1 text-center">
      <p className="text-lg font-extrabold leading-none tabular-nums dark:text-white">{nilai}</p>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">{label}</p>
    </div>
  );
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
  const waLink = waIntl ? `https://wa.me/${waIntl}?text=${encodeURIComponent(sapaan)}` : null;

  const sejak = profil.created_at
    ? new Date(profil.created_at).toLocaleDateString("id-ID", { month: "short", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 sm:pb-16">
      {/*
        Sampul.
        Sebelumnya sampul dan isi halaman adalah dua blok yang kebetulan
        bertumpuk: logonya melayang di tengah dengan margin negatif, dan semua
        yang di bawahnya rata tengah — termasuk bio panjang, yang paling susah
        dibaca justru kalau rata tengah. Sekarang keduanya satu kartu: sampul,
        lalu identitas toko rata kiri di layar lebar (tetap di tengah di ponsel,
        karena di sana kolomnya memang sempit).
      */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div
          className="relative h-36 sm:h-52"
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
          {/* Peredup tipis: nama toko di bawahnya tetap terbaca apa pun
              gambarnya, termasuk foto terang yang diunggah penjual. */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
        </div>

        <div className="px-5 pb-5 sm:px-7 sm:pb-6">
          <div className="-mt-12 flex flex-col items-center gap-4 text-center sm:-mt-14 sm:flex-row sm:items-end sm:text-left">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-2xl font-bold shadow-md dark:border-slate-900 dark:bg-slate-900 sm:h-28 sm:w-28"
              style={{ color: warna.utama }}
            >
              {profil.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profil.logo_url} alt={nama} className="h-full w-full object-cover" />
              ) : (
                nama.slice(0, 2).toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1 sm:pb-1">
              <h1 className="flex items-center justify-center gap-2 text-xl font-extrabold tracking-tight sm:justify-start sm:text-2xl">
                <span className="truncate">{nama}</span>
                {profil.trusted_seller && (
                  <span title="Penjual terverifikasi" className="shrink-0 text-sky-500">✓</span>
                )}
              </h1>

              {profil.tagline && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-slate-400">{profil.tagline}</p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-xs sm:justify-start">
                {/* Titik berwarna, bukan cuma kata: keadaan buka/tutup adalah
                    hal pertama yang dicari pembeli, dan mata menangkap warna
                    lebih dulu daripada huruf. */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold"
                  style={buka ? { background: warna.muda, color: warna.teks } : { background: "#f1f5f9", color: "#64748b" }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: buka ? warna.utama : "#94a3b8" }}
                  />
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
              </div>
            </div>
          </div>

          {/* Angka-angka toko. Dipisah dari lencana di atas supaya yang
              menerangkan JAM BUKA tidak berdesakan dengan yang menerangkan
              REKAM JEJAK — dua hal yang dicari pada saat yang berbeda. */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1 divide-x divide-gray-200 rounded-2xl bg-gray-50 py-3 dark:divide-slate-800 dark:bg-slate-800/40 sm:justify-start sm:px-2">
            <Angka nilai={aktif.length} label="barang dijual" />
            <Angka nilai={jumlahTerjual} label="terjual" />
            {sejak && <Angka nilai={sejak} label="bergabung" />}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ background: warna.utama }}
              >
                💬 Chat penjual
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
              className="mt-5 flex gap-2.5 rounded-2xl border px-4 py-3 text-left text-sm"
              style={{ background: warna.muda, borderColor: `${warna.utama}33`, color: warna.teks }}
            >
              <span aria-hidden>📣</span>
              <p className="min-w-0 whitespace-pre-line">{profil.store_announcement}</p>
            </div>
          )}

          {profil.bio && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-slate-400">
              {profil.bio}
            </p>
          )}
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold sm:text-lg">Barang di toko ini</h2>
          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-300">
            {aktif.length}
          </span>
        </div>

        {aktif.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center dark:border-slate-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Belum ada barang yang sedang dijual di sini.
            </p>
            {waLink && (
              <>
                <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500 dark:text-slate-400">
                  Tokonya sudah ada, isinya yang belum. Kalau kamu mencari sesuatu, tanyakan langsung.
                </p>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: warna.utama }}
                >
                  Tanya penjualnya
                </a>
              </>
            )}
          </div>
        ) : (
          <TokoKatalog listings={aktif} warna={warna} />
        )}
      </section>

      {terjual.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-bold sm:text-lg">Pernah terjual</h2>
          <p className="mb-4 mt-0.5 text-xs text-gray-500 dark:text-slate-400">
            Bukan untuk dibeli — ini jejak transaksi yang sudah selesai.
          </p>
          <div className="grid grid-cols-2 gap-3 opacity-70 sm:grid-cols-3 lg:grid-cols-4">
            {terjual.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      {/*
        Ajakan penutup. Kalimat lamanya — "Toko ini gratis dibuat" — benar tapi
        setengah: yang membuat orang membuka toko bukan halamannya yang gratis,
        melainkan jualannya yang jadi tanpa biaya tayang.
      */}
      <div
        className="mt-12 overflow-hidden rounded-3xl border px-6 py-8 text-center"
        style={{ background: warna.muda, borderColor: `${warna.utama}33` }}
      >
        <p className="text-lg font-extrabold" style={{ color: warna.teks }}>
          Punya toko di sini, jualannya gratis
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-sm" style={{ color: warna.teks, opacity: 0.85 }}>
          Buat toko sekali — gratis — lalu semua barang yang kamu pasang tayang tanpa biaya.
          Alamatnya jadi milikmu sendiri, seperti halaman ini.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard/toko"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: warna.utama }}
          >
            Buat toko punyamu
          </Link>
          <Link
            href="/jual"
            className="rounded-xl border border-white/60 bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90"
            style={{ color: warna.teks }}
          >
            Pasang barang
          </Link>
        </div>
      </div>

      {/* Bilah lekat khusus ponsel: nomor penjual tidak boleh hilang di atas
          layar begitu orang menggulir katalognya. */}
      {waLink && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:hidden">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
            style={{ background: warna.utama }}
          >
            💬 Chat {nama}
          </a>
        </div>
      )}
    </div>
  );
}

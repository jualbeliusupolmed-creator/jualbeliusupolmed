import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWaForBaileys } from "@/lib/constants";
import { AKSEN, aksenAman, namaToko, tokoAktif } from "@/lib/toko";
import ProductCard from "@/components/ProductCard";
import TokoHero from "@/components/TokoHero";
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
    // Toko yang belum disetujui admin tidak tayang. Alamatnya tetap dipegang
    // penjualnya (slug-nya sudah tercatat), cuma halamannya belum ada isinya
    // untuk umum — persis seperti sebelum ia mengajukan.
    if (!tokoAktif(profil)) return null;

    const [{ data: aktif }, { data: terjual }, { data: ulasan }] = await Promise.all([
      supa.from("listings").select("*").eq("seller_wa", profil.wa)
        .eq("status", "active").order("bumped_at", { ascending: false }),
      supa.from("listings").select("*").eq("seller_wa", profil.wa)
        .eq("status", "sold").order("created_at", { ascending: false }).limit(6),
      // Tabelnya `seller_ratings` dengan kolom `rating` (bukan `stars`) — nama
      // yang beda tipis ini sudah pernah membuat penilaian tidak muncul.
      supa.from("seller_ratings").select("rating, comment, buyer_name, created_at")
        .eq("seller_wa", profil.wa).order("created_at", { ascending: false }).limit(3),
    ]);

    // ProductCard membaca lencana distributor dari listing.seller_profiles,
    // dan kita sudah memegang profilnya — tempelkan daripada menyuruh setiap
    // kartu menanyakannya lagi ke basis data.
    for (const l of [...(aktif || []), ...(terjual || [])]) l.seller_profiles = profil;

    const { count: jumlahTerjual } = await supa
      .from("listings").select("id", { count: "exact", head: true })
      .eq("seller_wa", profil.wa).eq("status", "sold");

    const daftarUlasan = ulasan || [];
    const rata = daftarUlasan.length
      ? daftarUlasan.reduce((t, u) => t + (u.rating || 0), 0) / daftarUlasan.length
      : 0;

    return {
      profil,
      aktif: aktif || [],
      terjual: terjual || [],
      jumlahTerjual: jumlahTerjual || 0,
      ulasan: daftarUlasan,
      rataUlasan: rata,
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

/** Judul bagian: titik warna toko + nama bagian + hitungan opsional.
 *  Satu bentuk untuk semua bagian — halaman yang tiap judulnya beda bentuk
 *  terbaca seperti tiga halaman yang ditempel jadi satu. */
function Judul({ children, jumlah, warna, redup }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span
        className="h-5 w-1.5 shrink-0 rounded-full"
        style={{ background: redup ? "#cbd5e1" : warna.utama }}
      />
      <h2 className="text-[17px] font-extrabold tracking-tight sm:text-lg">{children}</h2>
      {jumlah != null && (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-500 dark:bg-slate-800 dark:text-slate-400">
          {jumlah}
        </span>
      )}
    </div>
  );
}

/** Baris keterangan di panel "Tentang toko". */
function Info({ ikon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-3 py-2.5">
      <span className="w-5 shrink-0 text-center text-sm" aria-hidden>{ikon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-0.5 whitespace-pre-line text-sm text-gray-700 dark:text-slate-300">{children}</p>
      </div>
    </div>
  );
}

export default async function HalamanToko({ params }) {
  const data = await ambilToko(params.slug);
  if (!data) notFound();

  const { profil, aktif, terjual, jumlahTerjual, ulasan, rataUlasan } = data;
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
    <div className="mx-auto max-w-5xl px-3 pb-28 sm:px-4 sm:pb-16">
      <div className="pt-3 sm:pt-5">
        <TokoHero
          profil={profil}
          nama={nama}
          warna={warna}
          waLink={waLink}
          statistik={{
            aktif: aktif.length,
            terjual: jumlahTerjual,
            ulasan: ulasan.length,
            rata: rataUlasan,
            sejak,
          }}
        />
      </div>

      {profil.store_announcement && (
        <div
          className="mt-3 flex items-start gap-3 rounded-2xl border px-4 py-3.5"
          style={{ background: warna.muda, borderColor: `${warna.utama}2e` }}
        >
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm text-white"
            style={{ background: warna.utama }}
            aria-hidden
          >
            📣
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: warna.utama }}>
              Pengumuman toko
            </p>
            <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed" style={{ color: warna.teks }}>
              {profil.store_announcement}
            </p>
          </div>
        </div>
      )}

      <section className="mt-7">
        <Judul jumlah={aktif.length} warna={warna}>Barang di toko ini</Judul>

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

      {/* Dua panel berdampingan. Halaman toko yang isinya cuma satu-dua barang
          butuh sesuatu yang benar-benar berguna di bawahnya, bukan ruang kosong:
          keterangan tokonya, dan cara membeli di sini. */}
      <section className="mt-8 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Tentang toko
          </h2>
          <div className="mt-2 divide-y divide-gray-100 dark:divide-slate-800">
            <Info ikon="📝" label="Deskripsi">{profil.bio}</Info>
            <Info ikon="📍" label="Wilayah / COD">{profil.store_area}</Info>
            {profil.store_gmaps && (
              <Info ikon="🗺️" label="Lokasi Maps">
                <a href={profil.store_gmaps} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: warna.utama }}>
                  Buka Peta ↗
                </a>
              </Info>
            )}
            <Info ikon="🕒" label="Jam buka">{profil.store_hours}</Info>
            <Info ikon="📱" label="WhatsApp">{profil.wa}</Info>
            <Info ikon="🔗" label="Alamat toko">{`jualbeliusupolmed.web.id/toko/${profil.slug}`}</Info>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Cara belanja di sini
          </h2>
          <ol className="mt-3 space-y-3">
            {[
              ["Pilih barangnya", "Ketuk barang di atas untuk melihat foto, harga, dan keterangan lengkapnya."],
              ["Chat penjualnya", "Tombol WhatsApp membuka chat langsung ke penjual — tanya stok, nego, atau janjian."],
              ["COD di kampus", "Ketemuan di titik yang disepakati. Kalau ada masalah, admin bisa dimintai tolong."],
            ].map(([judul, isi], i) => (
              <li key={judul} className="flex gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: warna.utama }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold dark:text-white">{judul}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-slate-400">{isi}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {ulasan.length > 0 && (
        <section className="mt-8">
          <Judul jumlah={`${rataUlasan.toFixed(1)}★`} warna={warna}>Kata pembeli</Judul>
          <div className="grid gap-3 sm:grid-cols-3">
            {ulasan.map((u, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm" style={{ color: warna.utama }}>
                  {"★".repeat(Math.max(1, Math.round(u.rating || 0)))}
                  <span className="text-gray-300 dark:text-slate-700">
                    {"★".repeat(Math.max(0, 5 - Math.round(u.rating || 0)))}
                  </span>
                </p>
                {u.comment && (
                  <p className="mt-1.5 line-clamp-4 text-sm text-gray-600 dark:text-slate-400">“{u.comment}”</p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {u.buyer_name || "Pembeli"}
                  {u.created_at ? ` · ${new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {terjual.length > 0 && (
        <section className="mt-8">
          <Judul warna={warna} redup>Pernah terjual</Judul>
          <p className="-mt-2 mb-4 pl-4 text-xs text-gray-500 dark:text-slate-400">
            Bukan untuk dibeli — ini jejak transaksi yang sudah selesai.
          </p>
          <div className="grid grid-cols-2 gap-3 opacity-70 sm:grid-cols-3 lg:grid-cols-4">
            {terjual.map((l) => (
              <ProductCard key={l.id} listing={l} tanpaPenjual />
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
        className="mt-10 overflow-hidden rounded-3xl border px-6 py-8 text-center"
        style={{ background: warna.muda, borderColor: `${warna.utama}33` }}
      >
        <p className="text-lg font-extrabold" style={{ color: warna.teks }}>
          Punya toko fisik? Gabung jadi Toko Mitra
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-sm" style={{ color: warna.teks, opacity: 0.85 }}>
          Khusus pemilik toko fisik di sekitar USU & Polmed dengan paket langganan aktif.
          Semua barang tayang tanpa biaya per iklan, punya etalase digital & alamat website sendiri.
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
            href="/"
            className="rounded-xl border border-white/60 bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90"
            style={{ color: warna.teks }}
          >
            Lihat barang lain
          </Link>
        </div>
      </div>

      {/* Bilah lekat khusus ponsel: nomor penjual tidak boleh hilang di atas
          layar begitu orang menggulir katalognya. Dibuat melayang ala iOS. */}
      {waLink && (
        <div className="fixed bottom-[80px] left-4 right-4 z-40 md:hidden flex justify-center pointer-events-none animate-fade-in-up">
          <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full bg-white/90 p-2 pl-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl border border-gray-100 dark:bg-slate-900/90 dark:border-slate-800 dark:shadow-black/50">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10">
              {profil.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profil.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-xs font-black text-white"
                  style={{ backgroundImage: `linear-gradient(145deg, ${warna.utama}, ${warna.utama}b0)` }}
                >
                  {nama.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold leading-tight dark:text-white">{nama}</p>
              <p className="truncate text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                {buka ? "Buka sekarang" : "Sedang tutup"}
              </p>
            </div>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full px-5 py-2 text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
              style={{ background: warna.utama, shadowColor: `${warna.utama}33` }}
            >
              Chat
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

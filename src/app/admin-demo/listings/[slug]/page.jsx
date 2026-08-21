import { notFound } from "next/navigation";
import Link from "next/link";
import AdminListingDetail from "../../../admin/listings/[slug]/AdminListingDetail";
import { listingsDemo, paymentsDemo, reportsDemo, ratingsDemo, getDemoStats } from "@/lib/demoData";

export const dynamic = "force-dynamic";

export const metadata = { title: "Detail Iklan (Demo) — Admin" };

/**
 * Kembaran /admin/listings/[slug]. Komponen detailnya sama persis; yang
 * berbeda cuma dari mana iklannya diambil.
 *
 * Slug demo dibuat oleh buildSlug(judul, id) yang sama seperti aslinya, jadi
 * tautan dari tabel di panel demo mendarat di sini tanpa perlakuan khusus.
 */
export default function ListingDemoPage({ params }) {
  const slug = decodeURIComponent(params.slug);
  const potongan = slug.split("-").pop();
  const listing =
    listingsDemo.find((l) => l.id === slug) ||
    listingsDemo.find((l) => l.id.endsWith(potongan)) ||
    listingsDemo.find((l) => slug.startsWith(l.id));

  if (!listing) notFound();

  return (
    <div>
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/admin-demo/overview" className="hover:text-gray-700 dark:hover:text-slate-200">Admin</Link>
        <span>/</span>
        <Link href="/admin-demo/listings" className="hover:text-gray-700 dark:hover:text-slate-200">Listing</Link>
        <span>/</span>
        <span className="truncate text-gray-600 dark:text-slate-300">{listing.title}</span>
      </nav>

      <AdminListingDetail
        listing={listing}
        payments={paymentsDemo.filter((p) => p.listing_id === listing.id)}
        reports={reportsDemo.filter((r) => r.listing_id === listing.id)}
        ratings={ratingsDemo.filter((r) => r.listing_id === listing.id)}
        categories={getDemoStats().categories}
      />
    </div>
  );
}

import Link from "next/link";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { PageHeader } from "@/components/admin/ui";
import AdminObrolanList from "./AdminObrolanList";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AuditCariTemanPage({ searchParams }) {
  const q = String(searchParams?.q || "").trim();
  const typeFilter = String(searchParams?.type || "all").trim();
  const page = Math.max(1, Number(searchParams?.page || 1));
  const from = (page - 1) * PAGE_SIZE;
  const supa = getAdminClient();

  let query = supa
    .from("chat_rooms")
    .select("id, type, listing_id, user1_id, user1_alias, user1_faculty, user2_id, user2_alias, user2_faculty, status, created_at, updated_at", { count: "exact" });

  if (typeFilter === "marketplace") {
    query = query.eq("type", "marketplace");
  } else if (typeFilter === "random") {
    query = query.eq("type", "random");
  } else if (typeFilter === "direct") {
    query = query.eq("type", "direct");
  }

  const { data: rooms, count, error } = await query
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const roomIds = (rooms || []).map((room) => room.id);
  const { data: messages } = roomIds.length
    ? await supa
      .from("chat_messages")
      .select("id, room_id, sender_id, sender_alias, message, created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: true })
    : { data: [] };

  const messagesByRoom = {};
  for (const message of messages || []) {
    if (!messagesByRoom[message.room_id]) {
      messagesByRoom[message.room_id] = [];
    }
    messagesByRoom[message.room_id].push(message);
  }

  // Fetch listing details for marketplace rooms
  const listingIds = Array.from(
    new Set((rooms || []).map((r) => r.listing_id).filter(Boolean))
  );
  const listingMap = {};
  if (listingIds.length > 0) {
    const { data: listings } = await supa
      .from("listings")
      .select("id, title, price, images, slug, is_sold")
      .in("id", listingIds);
    (listings || []).forEach((item) => {
      if (item.id) listingMap[item.id] = item;
    });
  }

  // Resolve user1_id and user2_id hashes or plain WA numbers & seller profiles
  const allUserIds = Array.from(new Set([
    ...(rooms || []).map((r) => r.user1_id).filter(Boolean),
    ...(rooms || []).map((r) => r.user2_id).filter(Boolean),
    ...(messages || []).map((m) => m.sender_id).filter(Boolean),
  ]));

  const waMap = {};
  const profileMap = {};

  // For marketplace & direct rooms, user1_id and user2_id are real WA numbers
  (rooms || []).forEach((r) => {
    if (r.type === "marketplace" || r.type === "direct") {
      if (r.user1_id) waMap[r.user1_id] = r.user1_id;
      if (r.user2_id) waMap[r.user2_id] = r.user2_id;
    }
  });

  // For random chats, resolve hashed IDs via chat_identity_wa
  const potentialHashes = allUserIds.filter((id) => !waMap[id]);
  if (potentialHashes.length > 0) {
    const { data: identities } = await supa
      .from("chat_identity_wa")
      .select("user_hash, wa")
      .in("user_hash", potentialHashes);

    (identities || []).forEach((i) => {
      if (i.user_hash && i.wa) waMap[i.user_hash] = i.wa;
    });
  }

  const allResolvedWas = Array.from(new Set(Object.values(waMap).filter(Boolean)));
  if (allResolvedWas.length > 0) {
    const { data: profiles } = await supa
      .from("seller_profiles")
      .select("wa, name, anonymous_name, store_name, avatar_url")
      .in("wa", allResolvedWas);

    (profiles || []).forEach((pr) => {
      if (pr.wa) profileMap[pr.wa] = pr;
    });
  }

  // Filter rooms based on search query
  const filteredRooms = (rooms || []).filter((room) => {
    if (!q) return true;
    const qLower = q.toLowerCase();
    const roomMessages = messagesByRoom[room.id] || [];
    const wa1 = room.user1_id ? waMap[room.user1_id] : "";
    const wa2 = room.user2_id ? waMap[room.user2_id] : "";
    const prof1 = wa1 ? profileMap[wa1] : null;
    const prof2 = wa2 ? profileMap[wa2] : null;
    const listing = room.listing_id ? listingMap[room.listing_id] : null;

    const messagesText = roomMessages.map((m) => `${m.sender_alias}: ${m.message}`).join(" ");

    const searchTarget = [
      room.id,
      room.type,
      listing?.title,
      room.user1_alias,
      room.user1_faculty,
      room.user2_alias,
      room.user2_faculty,
      room.status,
      wa1,
      wa2,
      prof1?.name,
      prof1?.anonymous_name,
      prof1?.store_name,
      prof2?.name,
      prof2?.anonymous_name,
      prof2?.store_name,
      messagesText,
    ].filter(Boolean).join(" ").toLowerCase();

    return searchTarget.includes(qLower);
  });

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  return (
    <div className="animate-fade-in font-sans">
      <PageHeader
        title="Audit &amp; Monitoring Percakapan"
        description={`${count || 0} ruang obrolan (Marketplace &amp; Cari Teman) tercatat di database.`}
      />

      {/* FILTER TABS & SEARCH BAR */}
      <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800">
          <Link
            href={`/admin/obrolan?type=all${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === "all"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Semua Obrolan
          </Link>
          <Link
            href={`/admin/obrolan?type=direct${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === "direct"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
             DM Pribadi
          </Link>
          <Link
            href={`/admin/obrolan?type=marketplace${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === "marketplace"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
             Marketplace
          </Link>
          <Link
            href={`/admin/obrolan?type=random${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === "random"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
             Cari Teman
          </Link>
        </div>

        <form method="GET" action="/admin/obrolan" className="relative flex items-center max-w-md w-full">
          {typeFilter !== "all" && <input type="hidden" name="type" value={typeFilter} />}
          <svg className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari pesan, barang, nama, WA..."
            className="w-full pl-10 pr-20 py-2 text-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus:border-primary dark:focus:border-emerald-400 text-slate-900 dark:text-white outline-none shadow-xs transition-all placeholder:text-slate-400"
          />
          {q && (
            <Link
              href={`/admin/obrolan?type=${typeFilter}`}
              className="absolute right-12 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ×
            </Link>
          )}
          <button
            type="submit"
            className="absolute right-1 px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Cari
          </button>
        </form>
      </div>

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100 flex items-center gap-2">
        <span><svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg></span>
        <span>Isi percakapan adalah data privat. Akses hanya bila diperlukan untuk moderasi transaksi, mediasi, atau tindak lanjut laporan keamanan komunitas.</span>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Gagal memuat monitoring percakapan.</div>
      ) : (
        <AdminObrolanList
          rooms={filteredRooms}
          messagesByRoom={messagesByRoom}
          waMap={waMap}
          profileMap={profileMap}
          listingMap={listingMap}
          searchQuery={q}
        />
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between font-sans" aria-label="Pagination audit chat">
          {page > 1 ? (
            <Link href={`/admin/obrolan?page=${page - 1}&type=${typeFilter}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200">
              ← Sebelumnya
            </Link>
          ) : <span />}
          <span className="text-xs text-slate-500 font-semibold">Halaman {page} dari {totalPages}</span>
          {page < totalPages ? (
            <Link href={`/admin/obrolan?page=${page + 1}&type=${typeFilter}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200">
              Berikutnya →
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}

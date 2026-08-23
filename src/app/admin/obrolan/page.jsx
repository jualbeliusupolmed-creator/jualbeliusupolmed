import Link from "next/link";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { PageHeader } from "@/components/admin/ui";
import AdminObrolanList from "./AdminObrolanList";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AuditCariTemanPage({ searchParams }) {
  const q = String(searchParams?.q || "").trim();
  const page = Math.max(1, Number(searchParams?.page || 1));
  const from = (page - 1) * PAGE_SIZE;
  const supa = getAdminClient();

  const { data: rooms, count, error } = await supa
    .from("chat_rooms")
    .select("id, user1_id, user1_alias, user1_faculty, user2_id, user2_alias, user2_faculty, status, created_at, updated_at", { count: "exact" })
    .eq("type", "random")
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

  // Resolve user1_id and user2_id hashes to real WA numbers & seller profiles
  const allUserHashes = Array.from(new Set([
    ...(rooms || []).map((r) => r.user1_id).filter(Boolean),
    ...(rooms || []).map((r) => r.user2_id).filter(Boolean),
    ...(messages || []).map((m) => m.sender_id).filter(Boolean),
  ]));

  const waMap = {};
  const profileMap = {};

  if (allUserHashes.length > 0) {
    const { data: identities } = await supa
      .from("chat_identity_wa")
      .select("user_hash, wa")
      .in("user_hash", allUserHashes);

    (identities || []).forEach((i) => {
      if (i.user_hash && i.wa) waMap[i.user_hash] = i.wa;
    });

    const was = Array.from(new Set((identities || []).map((i) => i.wa).filter(Boolean)));
    if (was.length > 0) {
      const { data: profiles } = await supa
        .from("seller_profiles")
        .select("wa, name, anonymous_name, store_name, avatar_url")
        .in("wa", was);

      (profiles || []).forEach((pr) => {
        if (pr.wa) profileMap[pr.wa] = pr;
      });
    }
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

    const messagesText = roomMessages.map((m) => `${m.sender_alias}: ${m.message}`).join(" ");

    const searchTarget = [
      room.id,
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
        title="Audit Cari Teman &amp; Percakapan"
        description={`${count || 0} ruang obrolan anonim tercatat. Identitas peserta terhubung langsung ke profil pengguna.`}
      />

      {/* SEARCH BAR */}
      <form method="GET" action="/admin/obrolan" className="mb-5">
        <div className="relative flex items-center max-w-lg">
          <svg className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari isi percakapan, nama mahasiswa, no. WA, atau ID room..."
            className="w-full pl-10 pr-24 py-2.5 text-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus:border-primary dark:focus:border-emerald-400 text-slate-900 dark:text-white outline-none shadow-xs transition-all placeholder:text-slate-400"
          />
          {q && (
            <Link
              href="/admin/obrolan"
              className="absolute right-14 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Reset
            </Link>
          )}
          <button
            type="submit"
            className="absolute right-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Cari
          </button>
        </div>
      </form>

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100 flex items-center gap-2">
        <span>🔒</span>
        <span>Isi percakapan adalah data privat. Akses hanya bila diperlukan untuk moderasi atau tindak lanjut laporan keamanan komunitas.</span>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Gagal memuat audit percakapan.</div>
      ) : (
        <AdminObrolanList
          rooms={filteredRooms}
          messagesByRoom={messagesByRoom}
          waMap={waMap}
          profileMap={profileMap}
          searchQuery={q}
        />
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between font-sans" aria-label="Pagination audit chat">
          {page > 1 ? (
            <Link href={`/admin/obrolan?page=${page - 1}`} className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200">
              ← Sebelumnya
            </Link>
          ) : <span />}
          <span className="text-xs text-slate-500 font-semibold">Halaman {page} dari {totalPages}</span>
          {page < totalPages ? (
            <Link href={`/admin/obrolan?page=${page + 1}`} className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200">
              Berikutnya →
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}

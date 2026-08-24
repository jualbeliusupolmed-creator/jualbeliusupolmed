import { getAdminClient } from "@/lib/supabaseAdmin";
import { PageHeader, Panel, Stat, StatGrid, Badge } from "@/components/admin/ui";
import Image from "next/image";
import AdminTemanActions from "./AdminTemanActions";

export const dynamic = "force-dynamic";

export default async function AdminTemanPage() {
  const supa = getAdminClient();

  // Fetch metrics in parallel
  const [
    profilesRes,
    swipesRes,
    matchesRes,
    recentProfilesRes,
    recentMatchesRes,
  ] = await Promise.all([
    supa.from("teman_profiles").select("id", { count: "exact", head: true }),
    supa.from("teman_swipes").select("action", { count: "exact" }),
    supa.from("teman_matches").select("id", { count: "exact", head: true }),
    supa
      .from("teman_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
    supa
      .from("teman_matches")
      .select("id, matched_at, user1_id, user2_id")
      .order("matched_at", { ascending: false })
      .limit(10),
  ]);

  const totalProfiles = profilesRes.count || 0;
  const totalSwipes = swipesRes.count || 0;
  const totalMatches = matchesRes.count || 0;
  const profiles = recentProfilesRes.data || [];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Moderasi & Tracking Swipe Teman Kampus"
        description="Pantau profil aktif, aktivitas swipe, dan interaksi mutual match mahasiswa USU & Polmed."
      />

      {/* METRICS ROW */}
      <StatGrid>
        <Stat
          label="Total Profil Teman"
          value={totalProfiles}
          sub="Pengguna yang sudah upload foto"
        />
        <Stat
          label="Total Aksi Swipe"
          value={totalSwipes}
          sub="Interaksi Like & Pass"
        />
        <Stat
          label="Mutual Matches"
          value={totalMatches}
          sub="Pasangan yang saling cocok 🎉"
        />
      </StatGrid>

      {/* DAFTAR PROFIL TEMAN */}
      <Panel
        title="Daftar Profil Mahasiswa (Dengan Foto)"
        description="Tinjau foto profil dan bio untuk moderasi konten yang pantas."
      >
        {profiles.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Belum ada profil teman yang dibuat di database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-500 dark:border-gray-800 dark:bg-gray-800/40">
                <tr>
                  <th className="p-3">Foto &amp; Nama</th>
                  <th className="p-3">Kampus / Fakultas</th>
                  <th className="p-3">Tujuan (Intent)</th>
                  <th className="p-3">Kontak (Privat)</th>
                  <th className="p-3 text-center">Likes / Matches</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Aksi Moderasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                    {/* Foto & Nama */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 border border-gray-200 dark:border-gray-700 shadow-xs">
                          {p.photo_url ? (
                            <Image
                              src={p.photo_url}
                              alt={p.display_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-gray-400">
                              📷
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {p.display_name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            ID: {p.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Kampus / Fakultas */}
                    <td className="p-3">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {p.campus}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {p.faculty || "-"} {p.batch ? `('${p.batch.slice(-2)})` : ""}
                      </p>
                    </td>

                    {/* Intent */}
                    <td className="p-3">
                      <span className="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                        {p.intent || "Teman Santai ☕"}
                      </span>
                    </td>

                    {/* Kontak */}
                    <td className="p-3">
                      <p className="text-[11px] text-gray-700 dark:text-gray-300">
                        WA: {p.whatsapp || "-"}
                      </p>
                      <p className="text-[10px] text-pink-600 dark:text-pink-400">
                        IG: {p.instagram ? `@${p.instagram}` : "-"}
                      </p>
                    </td>

                    {/* Likes & Matches */}
                    <td className="p-3 text-center">
                      <p className="font-bold text-emerald-600">
                        {p.likes_received || 0} Likes
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {p.matches_count || 0} Match
                      </p>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <Badge tone={p.is_active ? "ok" : "netral"}>
                        {p.is_active ? "Aktif" : "Dinonaktifkan"}
                      </Badge>
                    </td>

                    {/* Aksi */}
                    <td className="p-3 text-right">
                      <AdminTemanActions
                        profileId={p.id}
                        isActive={p.is_active}
                        displayName={p.display_name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

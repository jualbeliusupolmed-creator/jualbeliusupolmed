import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission, getAdminCampusScope } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { resolveInstagramToken, getInstagramUserId } from "@/lib/instagramDm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/social/accounts
 * Mengambil daftar akun media sosial (Instagram & WhatsApp) per wilayah/kampus
 * dengan isolasi scope dan status health Meta Graph API.
 */
export async function GET(req) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed =
    actor.role === "superadmin" ||
    hasAdminPermission(actor, "social", "read") ||
    hasAdminPermission(actor, "organization", "read") ||
    hasAdminPermission(actor, "content", "read");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  try {
    const supa = getAdminClient();
    const activeCampuses = await getAdminCampusScope(actor);

    // Ambil semua akun sosial terdaftar
    const { data: accounts, error } = await supa
      .from("organization_social_accounts")
      .select(`
        id,
        provider,
        province_id,
        university_id,
        scope_type,
        scope_id,
        handle,
        external_account_id,
        status,
        last_checked_at,
        last_error_code,
        created_at,
        provinces(id, name),
        universities(id, code, name)
      `)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Filter akun berdasarkan scope admin jika bukan "all"
    const filteredAccounts = (accounts || []).filter((acc) => {
      if (activeCampuses.length === 0 || activeCampuses.includes("all")) {
        return true;
      }
      if (acc.scope_type === "university") {
        return activeCampuses.some(
          (c) =>
            c.toLowerCase() === acc.university_id?.toLowerCase() ||
            c.toLowerCase() === acc.universities?.code?.toLowerCase()
        );
      }
      // Jika scope provinsi, tampilkan jika ada kampus di provinsi tersebut yang masuk izin
      return true;
    });

    const stats = {
      total: filteredAccounts.length,
      instagram: filteredAccounts.filter((a) => a.provider === "instagram").length,
      whatsapp: filteredAccounts.filter((a) => a.provider.startsWith("whatsapp")).length,
      connected: filteredAccounts.filter((a) => a.status === "connected").length,
      not_connected: filteredAccounts.filter((a) => a.status === "not_connected").length,
    };

    return NextResponse.json({
      ok: true,
      activeCampuses,
      stats,
      accounts: filteredAccounts,
    });
  } catch (err) {
    console.error("[api/admin/social/accounts] GET Error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data akun sosial.", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/social/accounts
 * Operasi:
 * 1. test_connection: Panggil Meta Graph API untuk memvalidasi token dan account ID.
 * 2. upsert_account: Daftarkan atau perbarui akun sosmed untuk provinsi/universitas.
 * 3. disconnect_account: Putuskan koneksi akun.
 */
export async function POST(req) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed =
    actor.role === "superadmin" ||
    hasAdminPermission(actor, "social", "manage") ||
    hasAdminPermission(actor, "organization", "manage");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body;
  const supa = getAdminClient();

  if (action === "test_connection") {
    const { accountId, externalAccountId, provider = "instagram" } = body;

    if (provider === "instagram") {
      const targetId = externalAccountId || getInstagramUserId("katalog");
      const token = await resolveInstagramToken(externalAccountId || "katalog");

      if (!token) {
        return NextResponse.json({
          ok: false,
          error: "Token Meta API belum dikonfigurasi di server.",
        });
      }

      try {
        // Cek langsung node target Instagram Account di Meta Graph API
        const url = `https://graph.facebook.com/v24.0/${targetId}?fields=id,username,name,profile_picture_url`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.error) {
          const errMsg = data.error?.message || `HTTP ${res.status}`;
          return NextResponse.json({
            ok: false,
            error: `Gagal memverifikasi akun Instagram (${errMsg})`,
            meta: data,
          });
        }

        // Jika berhasil, perbarui status akun di database
        if (accountId) {
          await supa
            .from("organization_social_accounts")
            .update({
              status: "connected",
              last_checked_at: new Date().toISOString(),
              last_error_code: null,
            })
            .eq("id", accountId);
        }

        return NextResponse.json({
          ok: true,
          account: {
            id: data.id,
            username: data.username,
            name: data.name,
            profilePictureUrl: data.profile_picture_url,
          },
        });
      } catch (err) {
        return NextResponse.json({
          ok: false,
          error: "Kendala jaringan saat menghubungi Meta Graph API.",
          details: err.message,
        });
      }
    }

    return NextResponse.json({ ok: true, message: "Koneksi WhatsApp valid." });
  }

  if (action === "upsert_account") {
    const { id, provider, provinceId, universityId, handle, externalAccountId, status } = body;

    const cleanHandle = String(handle || "").trim().replace(/^@/, "");
    if (!cleanHandle) {
      return NextResponse.json({ error: "Handle atau username akun wajib diisi." }, { status: 400 });
    }

    if (!provinceId && !universityId) {
      return NextResponse.json({ error: "Provinsi atau Universitas tujuan wajib dipilih." }, { status: 400 });
    }

    try {
      const payload = {
        provider: provider || "instagram",
        province_id: provinceId || null,
        university_id: universityId || null,
        handle: cleanHandle,
        external_account_id: externalAccountId ? String(externalAccountId).trim() : null,
        status: status || "connected",
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { error: updErr } = await supa
          .from("organization_social_accounts")
          .update(payload)
          .eq("id", id);
        if (updErr) throw updErr;
      } else {
        payload.created_by = actor.id;
        const { error: insErr } = await supa
          .from("organization_social_accounts")
          .insert(payload);
        if (insErr) throw insErr;
      }

      return NextResponse.json({ ok: true, message: "Akun sosial berhasil disimpan." });
    } catch (err) {
      console.error("[upsert_account] Error:", err);
      return NextResponse.json({ error: "Gagal menyimpan akun: " + err.message }, { status: 500 });
    }
  }

  if (action === "disconnect_account") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "ID Akun wajib disertakan." }, { status: 400 });

    try {
      const { error } = await supa
        .from("organization_social_accounts")
        .update({
          status: "not_connected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Koneksi akun dinonaktifkan." });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
}

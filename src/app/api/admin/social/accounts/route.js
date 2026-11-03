import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission, getAdminCampusScope } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { resolveInstagramToken } from "@/lib/instagramDm";
import { canManageSocialAccount, canManageSocialScope, getSocialAccount, getSocialScope } from "@/lib/socialAccountAccess";
import { assertInstagramTokenEncryptionReady, deleteInstagramAccountToken, getInstagramAccountToken, hasInstagramAccountToken, listInstagramAccountTokenIds, saveInstagramAccountToken } from "@/lib/instagramAccountCredentials";

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
        universities(id, code, name, province_id)
      `)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const tokenAccountIds = await listInstagramAccountTokenIds(supa);
    const legacyCatalogId = String(process.env.META_KATALOG_IG_USER_ID || "").trim();
    let legacyCatalogTokenAvailable = false;
    if (legacyCatalogId && (accounts || []).some((account) =>
      account.provider === "instagram" && String(account.external_account_id || "") === legacyCatalogId
    )) {
      try { legacyCatalogTokenAvailable = Boolean(await resolveInstagramToken(legacyCatalogId)); } catch {}
    }

    // Jangan memakai scope kosong sebagai akses global. null hanya berarti
    // superadmin memilih cakupan nasional; admin lain harus cocok dengan assignment.
    const filteredAccounts = (accounts || []).filter((acc) => canManageSocialAccount(actor, acc)).map((acc) => ({
      ...acc,
      has_access_token: tokenAccountIds.has(acc.id) || (
        acc.provider === "instagram" && legacyCatalogTokenAvailable &&
        String(acc.external_account_id || "") === legacyCatalogId
      ),
    }));

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
    const { accountId } = body;
    const { account, error: accountError } = await getSocialAccount(supa, accountId);
    if (accountError) return NextResponse.json({ error: "Gagal memeriksa akun sosial." }, { status: 500 });
    if (!account || !canManageSocialAccount(actor, account)) {
      return NextResponse.json({ error: "Akun tidak ditemukan atau di luar cakupan akses Anda." }, { status: 404 });
    }
    if (account.provider !== "instagram") {
      return NextResponse.json({ error: "Uji koneksi hanya tersedia untuk akun Instagram." }, { status: 400 });
    }

    {
      const externalAccountId = account.external_account_id;
      if (!externalAccountId) {
        return NextResponse.json({ error: "ID akun Instagram belum disimpan. Lengkapi pengaturan akun terlebih dahulu." }, { status: 409 });
      }
      if (!/^\d{5,40}$/.test(externalAccountId)) {
        return NextResponse.json({ error: "ID akun Instagram tidak valid." }, { status: 400 });
      }
      const targetId = externalAccountId;
      const token = await getInstagramAccountToken(supa, account);

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
          signal: AbortSignal.timeout(12000),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.error) {
          const errMsg = data.error?.message || `HTTP ${res.status}`;
          await supa.from("organization_social_accounts").update({
            status: "error",
            last_checked_at: new Date().toISOString(),
            last_error_code: String(data.error?.code || res.status).slice(0, 80),
          }).eq("id", accountId);
          return NextResponse.json({
            ok: false,
            error: `Gagal memverifikasi akun Instagram (${errMsg})`,
            meta: data,
          });
        }

        // Jika berhasil, perbarui status akun di database
        if (accountId) {
          const { error: updateError } = await supa
            .from("organization_social_accounts")
            .update({
              status: "connected",
              last_checked_at: new Date().toISOString(),
              last_error_code: null,
            })
            .eq("id", accountId);
          if (updateError) throw updateError;
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

  }

  if (action === "upsert_account") {
    const { id, provider, provinceId, universityId, handle, externalAccountId, accessToken } = body;
    const providers = new Set(["instagram", "whatsapp_channel", "whatsapp_group", "whatsapp_business"]);

    const cleanHandle = String(handle || "").trim().replace(/^@/, "");
    if (!cleanHandle) {
      return NextResponse.json({ error: "Handle atau username akun wajib diisi." }, { status: 400 });
    }

    const targetScope = await getSocialScope(supa, { provinceId, universityId });
    if (!targetScope) {
      return NextResponse.json({ error: "Provinsi atau Universitas tujuan wajib dipilih." }, { status: 400 });
    }
    if (!canManageSocialScope(actor, targetScope)) {
      return NextResponse.json({ error: "Anda tidak memiliki wewenang untuk cakupan tujuan ini." }, { status: 403 });
    }
    if (!providers.has(provider || "instagram")) {
      return NextResponse.json({ error: "Jenis akun sosial tidak valid." }, { status: 400 });
    }
    const normalizedProvider = provider || "instagram";
    const cleanExternalAccountId = externalAccountId ? String(externalAccountId).trim() : "";
    if (cleanExternalAccountId && normalizedProvider === "instagram" && !/^\d{5,40}$/.test(cleanExternalAccountId)) {
      return NextResponse.json({ error: "ID akun Instagram harus berupa ID numerik yang valid." }, { status: 400 });
    }
    if (accessToken && (normalizedProvider !== "instagram" || !cleanExternalAccountId)) {
      return NextResponse.json({ error: "Token hanya dapat disimpan pada akun Instagram yang sudah memiliki ID akun Meta." }, { status: 400 });
    }
    if (accessToken && (typeof accessToken !== "string" || accessToken.trim().length < 20 || accessToken.trim().length > 10000)) {
      return NextResponse.json({ error: "Token Instagram tidak valid." }, { status: 400 });
    }
    let previousAccount = null;
    if (id) {
      const { account, error } = await getSocialAccount(supa, id);
      if (error) return NextResponse.json({ error: "Gagal memeriksa akun sosial." }, { status: 500 });
      if (!account || !canManageSocialAccount(actor, account)) {
        return NextResponse.json({ error: "Akun yang akan diubah tidak ditemukan atau di luar cakupan Anda." }, { status: 404 });
      }
      previousAccount = account;
    }

    let suppliedToken = "";
    if (normalizedProvider === "instagram" && accessToken) {
      try {
        assertInstagramTokenEncryptionReady();
      } catch {
        return NextResponse.json({ error: "Penyimpanan token belum siap. Operator perlu mengatur kunci enkripsi server sebelum menghubungkan Instagram." }, { status: 503 });
      }
      suppliedToken = accessToken.trim();
      try {
        const checkUrl = `https://graph.facebook.com/v24.0/${cleanExternalAccountId}?fields=id,username,name`;
        const response = await fetch(checkUrl, {
          headers: { Authorization: `Bearer ${suppliedToken}` },
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
        const meta = await response.json().catch(() => ({}));
        if (!response.ok || meta.error || String(meta.id || "") !== cleanExternalAccountId) {
          return NextResponse.json({
            error: "Meta tidak dapat memverifikasi token untuk akun Instagram yang dipilih. Periksa Business Account ID, token, dan izin publikasi.",
          }, { status: 422 });
        }
      } catch {
        return NextResponse.json({ error: "Tidak dapat memverifikasi token ke Meta saat ini. Perubahan akun belum disimpan; coba lagi." }, { status: 503 });
      }
    }

    try {
      const payload = {
        provider: normalizedProvider,
        province_id: provinceId || null,
        university_id: universityId || null,
        handle: cleanHandle,
        external_account_id: cleanExternalAccountId || null,
        status: normalizedProvider === "instagram"
          ? cleanExternalAccountId ? "pending" : "not_connected"
          : cleanExternalAccountId ? "connected" : "not_connected",
        updated_at: new Date().toISOString(),
      };

      let savedAccountId = id;
      if (id) {
        const { error: updErr } = await supa
          .from("organization_social_accounts")
          .update(payload)
          .eq("id", id);
        if (updErr) throw updErr;
      } else {
        payload.created_by = actor.userId;
        const { data: inserted, error: insErr } = await supa
          .from("organization_social_accounts")
          .insert(payload)
          .select("id")
          .single();
        if (insErr) throw insErr;
        savedAccountId = inserted.id;
      }

      const credentialChanged = Boolean(previousAccount?.provider === "instagram" && (
        normalizedProvider !== "instagram" || previousAccount.external_account_id !== cleanExternalAccountId
      ));
      if (credentialChanged && !accessToken) await deleteInstagramAccountToken(supa, savedAccountId);

      let tokenReady = false;
      if (normalizedProvider === "instagram" && suppliedToken) {
        await saveInstagramAccountToken(supa, savedAccountId, cleanExternalAccountId, suppliedToken);
        tokenReady = true;
      } else if (normalizedProvider === "instagram" && cleanExternalAccountId && id && !credentialChanged) {
        tokenReady = await hasInstagramAccountToken(supa, savedAccountId, cleanExternalAccountId);
        if (!tokenReady && cleanExternalAccountId === String(process.env.META_KATALOG_IG_USER_ID || "").trim()) {
          tokenReady = Boolean(await resolveInstagramToken(cleanExternalAccountId));
        }
      }

      if (normalizedProvider === "instagram") {
        const { error: statusError } = await supa.from("organization_social_accounts").update({
          status: tokenReady ? "connected" : cleanExternalAccountId ? "pending" : "not_connected",
          last_checked_at: tokenReady ? new Date().toISOString() : null,
          last_error_code: null,
          updated_at: new Date().toISOString(),
        }).eq("id", savedAccountId);
        if (statusError) throw statusError;
      }

      return NextResponse.json({ ok: true, accountId: savedAccountId, message: tokenReady ? "Akun tersimpan dan koneksi Meta berhasil diuji." : "Akun tersimpan. Tambahkan token Meta untuk mengaktifkan publikasi." });
    } catch (err) {
      console.error("[upsert_account] Error:", err);
      return NextResponse.json({ error: "Gagal menyimpan akun: " + err.message }, { status: 500 });
    }
  }

  if (action === "disconnect_account") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "ID Akun wajib disertakan." }, { status: 400 });

    const { account, error: accountError } = await getSocialAccount(supa, id);
    if (accountError) return NextResponse.json({ error: "Gagal memeriksa akun sosial." }, { status: 500 });
    if (!account || !canManageSocialAccount(actor, account)) {
      return NextResponse.json({ error: "Akun tidak ditemukan atau di luar cakupan akses Anda." }, { status: 404 });
    }

    try {
      if (account.provider === "instagram") await deleteInstagramAccountToken(supa, id);
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


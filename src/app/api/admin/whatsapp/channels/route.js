import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission, getAdminCampusScope } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { tokenBotUtama } from "@/lib/botTokens";
import { sendChannelWa, sendWa } from "@/lib/fonnte";
import { canManageSocialAccount, canManageSocialScope, getSocialAccount, getSocialScope } from "@/lib/socialAccountAccess";

export const dynamic = "force-dynamic";

const getBaileysUrl = () =>
  (process.env.BAILEYS_API_URL || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\/+$/, "");

/**
 * GET /api/admin/whatsapp/channels
 * Mengambil daftar WhatsApp Channels, Gateway, dan Groups per wilayah/kampus
 * dengan status sinkronisasi live dari gateway Baileys.
 */
export async function GET(req) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed =
    actor.role === "superadmin" ||
    hasAdminPermission(actor, "social", "read") ||
    hasAdminPermission(actor, "whatsapp", "read") ||
    hasAdminPermission(actor, "organization", "read");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  try {
    const supa = getAdminClient();
    const activeCampuses = await getAdminCampusScope(actor);

    // Ambil akun WhatsApp dari organization_social_accounts
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
        created_at,
        provinces(id, name),
        universities(id, code, name, province_id)
      `)
      .in("provider", ["whatsapp_channel", "whatsapp_business", "whatsapp_group"])
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Filter sesuai scope admin
    const filteredAccounts = (accounts || []).filter((acc) => canManageSocialAccount(actor, acc));

    // Coba ambil metadata live dari Baileys gateway
    let liveNewsletters = [];
    let liveGroups = [];
    let gatewayOnline = false;

    const baseUrl = getBaileysUrl();
    const token = tokenBotUtama();

    if (baseUrl && token) {
      try {
        const [newsRes, groupRes] = await Promise.allSettled([
          fetch(`${baseUrl}/newsletters`, {
            headers: { Authorization: token },
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          }),
          fetch(`${baseUrl}/groups?fresh=0`, {
            headers: { Authorization: token },
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          }),
        ]);

        if (newsRes.status === "fulfilled" && newsRes.value.ok) {
          const nData = await newsRes.value.json().catch(() => ({}));
          liveNewsletters = nData.newsletters || [];
          gatewayOnline = true;
        }

        if (groupRes.status === "fulfilled" && groupRes.value.ok) {
          const gData = await groupRes.value.json().catch(() => ({}));
          liveGroups = gData.groups || [];
          gatewayOnline = true;
        }
      } catch {
        // Baileys timeout/offline
      }
    }

    // Gabungkan data relasional dengan metadata live
    const enrichedAccounts = filteredAccounts.map((acc) => {
      const jid = acc.external_account_id || (acc.handle.includes("@") ? acc.handle : "");
      let liveMeta = null;

      if (acc.provider === "whatsapp_channel" && jid) {
        liveMeta = liveNewsletters.find((n) => n.jid === jid) || null;
      } else if (acc.provider === "whatsapp_group" && jid) {
        liveMeta = liveGroups.find((g) => g.jid === jid) || null;
      }

      return {
        ...acc,
        liveMeta,
        liveName: liveMeta?.name || null,
        subscribers: liveMeta?.subscribers || liveMeta?.participants || null,
      };
    });

    const stats = {
      total: enrichedAccounts.length,
      channels: enrichedAccounts.filter((a) => a.provider === "whatsapp_channel").length,
      business: enrichedAccounts.filter((a) => a.provider === "whatsapp_business").length,
      groups: enrichedAccounts.filter((a) => a.provider === "whatsapp_group").length,
      gatewayOnline,
    };

    return NextResponse.json({
      ok: true,
      stats,
      accounts: enrichedAccounts,
      activeCampuses,
    });
  } catch (err) {
    console.error("[api/admin/whatsapp/channels] GET Error:", err);
    return NextResponse.json(
      { error: "Gagal memuat saluran WhatsApp.", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/whatsapp/channels
 * Operasi:
 * 1. resolve_channel_link: Mengonversi tautan invite saluran menjadi JID @newsletter.
 * 2. upsert_channel: Menambahkan atau menyunting saluran/grup per kampus atau provinsi.
 * 3. test_broadcast: Kirim pesan uji coba ke saluran atau grup.
 * 4. delete_channel: Hapus entitas saluran dari sistem.
 */
export async function POST(req) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed =
    actor.role === "superadmin" ||
    hasAdminPermission(actor, "social", "manage") ||
    hasAdminPermission(actor, "whatsapp", "manage");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body;
  const supa = getAdminClient();

  // 1. Resolve tautan invite menjadi JID
  if (action === "resolve_channel_link") {
    const { invite, provinceId, universityId } = body;
    const targetScope = await getSocialScope(supa, { provinceId, universityId });
    if (!targetScope) {
      return NextResponse.json({ error: "Pilih cakupan provinsi atau universitas yang valid." }, { status: 400 });
    }
    if (!canManageSocialScope(actor, targetScope)) {
      return NextResponse.json({ error: "Anda tidak memiliki wewenang untuk cakupan tujuan ini." }, { status: 403 });
    }
    let parsedInvite;
    try { parsedInvite = new URL(String(invite || "")); } catch {}
    if (!parsedInvite || parsedInvite.protocol !== "https:" || !["whatsapp.com", "www.whatsapp.com"].includes(parsedInvite.hostname) || !parsedInvite.pathname.startsWith("/channel/")) {
      return NextResponse.json({ error: "Masukkan link channel WhatsApp yang valid (https://whatsapp.com/channel/...)" }, { status: 400 });
    }

    const baseUrl = getBaileysUrl();
    const token = tokenBotUtama();
    if (!baseUrl || !token) {
      return NextResponse.json({ error: "Bot gateway WhatsApp belum terhubung." }, { status: 503 });
    }

    try {
      const res = await fetch(`${baseUrl}/newsletters/add`, {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ invite: invite.trim() }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.data?.jid) {
        return NextResponse.json({ error: data.error || "Gagal membaca link saluran dari WhatsApp." }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        channel: {
          jid: data.data.jid,
          name: data.data.name,
          description: data.data.description,
          subscribers: data.data.subscribers || 0,
        },
      });
    } catch (err) {
      return NextResponse.json({ error: "Gagal memproses saluran: " + err.message }, { status: 500 });
    }
  }

  // 2. Simpan atau perbarui akun/saluran
  if (action === "upsert_channel") {
    const { id, provider, provinceId, universityId, handle, externalAccountId } = body;
    const providers = new Set(["whatsapp_channel", "whatsapp_group", "whatsapp_business"]);

    const cleanHandle = String(handle || "").trim();
    if (!cleanHandle) {
      return NextResponse.json({ error: "Nama atau tautan saluran wajib diisi." }, { status: 400 });
    }

    const targetScope = await getSocialScope(supa, { provinceId, universityId });
    if (!targetScope) {
      return NextResponse.json({ error: "Pilih cakupan Provinsi atau Universitas." }, { status: 400 });
    }
    if (!canManageSocialScope(actor, targetScope)) {
      return NextResponse.json({ error: "Anda tidak memiliki wewenang untuk cakupan tujuan ini." }, { status: 403 });
    }
    if (!providers.has(provider || "whatsapp_channel")) {
      return NextResponse.json({ error: "Jenis akun WhatsApp tidak valid." }, { status: 400 });
    }
    const normalizedProvider = provider || "whatsapp_channel";
    const normalizedExternalId = externalAccountId ? String(externalAccountId).trim() : "";
    if (normalizedExternalId && normalizedProvider === "whatsapp_channel" && !/^\d{5,40}@newsletter$/.test(normalizedExternalId)) {
      return NextResponse.json({ error: "ID saluran harus berupa JID WhatsApp Channel yang valid." }, { status: 400 });
    }
    if (normalizedExternalId && normalizedProvider === "whatsapp_group" && !/^\d{5,40}(?:-\d{1,30})?@g\.us$/.test(normalizedExternalId)) {
      return NextResponse.json({ error: "ID grup harus berupa JID WhatsApp Group yang valid." }, { status: 400 });
    }
    if (normalizedExternalId && normalizedProvider === "whatsapp_business" && !/^\+?\d{8,20}(?:@s\.whatsapp\.net)?$/.test(normalizedExternalId)) {
      return NextResponse.json({ error: "ID WhatsApp Business harus berupa nomor WhatsApp yang valid." }, { status: 400 });
    }
    if (id) {
      const { account, error } = await getSocialAccount(supa, id);
      if (error) return NextResponse.json({ error: "Gagal memeriksa akun WhatsApp." }, { status: 500 });
      if (!account || !canManageSocialAccount(actor, account)) {
        return NextResponse.json({ error: "Akun yang akan diubah tidak ditemukan atau di luar cakupan Anda." }, { status: 404 });
      }
    }

    try {
      const payload = {
        provider: normalizedProvider,
        province_id: provinceId || null,
        university_id: universityId || null,
        handle: cleanHandle,
        external_account_id: normalizedExternalId || null,
        status: normalizedExternalId ? "connected" : "not_connected",
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { error: updErr } = await supa
          .from("organization_social_accounts")
          .update(payload)
          .eq("id", id);
        if (updErr) throw updErr;
      } else {
        payload.created_by = actor.userId;
        const { error: insErr } = await supa
          .from("organization_social_accounts")
          .insert(payload);
        if (insErr) throw insErr;
      }

      return NextResponse.json({ ok: true, message: "Kanal WhatsApp berhasil disimpan." });
    } catch (err) {
      console.error("[upsert_channel] Error:", err);
      return NextResponse.json({ error: "Gagal menyimpan kanal: " + err.message }, { status: 500 });
    }
  }

  // 3. Uji coba pengiriman pesan ke Saluran atau Grup
  if (action === "test_broadcast") {
    const { accountId, message } = body;
    const { account, error } = await getSocialAccount(supa, accountId);
    if (error) return NextResponse.json({ error: "Gagal memeriksa target siaran." }, { status: 500 });
    if (!account || !canManageSocialAccount(actor, account)) {
      return NextResponse.json({ error: "Target siaran tidak ditemukan atau di luar cakupan Anda." }, { status: 404 });
    }
    if (!["whatsapp_channel", "whatsapp_group", "whatsapp_business"].includes(account.provider)) {
      return NextResponse.json({ error: "Target bukan akun WhatsApp." }, { status: 400 });
    }
    if (account.status !== "connected") {
      return NextResponse.json({ error: "Hubungkan target WhatsApp terlebih dahulu." }, { status: 409 });
    }
    const cleanJid = String(account.external_account_id || (String(account.handle).includes("@") ? account.handle : "")).trim();
    if (!cleanJid || (account.provider === "whatsapp_channel" && !cleanJid.endsWith("@newsletter")) || (account.provider === "whatsapp_group" && !cleanJid.endsWith("@g.us"))) {
      return NextResponse.json({ error: "Target belum memiliki JID WhatsApp yang valid dan tersimpan." }, { status: 409 });
    }
    const testMsg = typeof message === "string" && message.trim()
      ? message.trim().slice(0, 1000)
      : `🔔 *Uji Coba Siaran Kampus Kita*\nKanal: ${account.handle}\nWaktu: ${new Date().toLocaleString("id-ID")}\nPesan uji coba sistem multi-channel berhasil terkirim.`;

    try {
      if (account.provider === "whatsapp_channel") {
        const res = await sendChannelWa(cleanJid, testMsg);
        if (!res.ok) {
          return NextResponse.json({ ok: false, error: res.error || "Gagal mengirim ke saluran." });
        }
        return NextResponse.json({ ok: true, message: "Pesan berhasil dipublikasikan ke WhatsApp Channel!" });
      }

      if (account.provider === "whatsapp_group") {
        const res = await sendWa(cleanJid, testMsg, null, null, { jenis: "grup" });
        if (!res.ok) {
          return NextResponse.json({ ok: false, error: res.galat || res.error || "Gagal mengirim ke grup." });
        }
        return NextResponse.json({ ok: true, message: "Pesan berhasil dikirim ke WhatsApp Group!" });
      }

      // Default pengiriman direct chat
      const res = await sendWa(cleanJid, testMsg);
      return NextResponse.json({ ok: res.ok, message: res.ok ? "Pesan terkirim!" : res.galat });
    } catch (err) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
  }

  // 4. Hapus saluran
  if (action === "delete_channel") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "ID Saluran wajib disertakan." }, { status: 400 });

    const { account, error: accountError } = await getSocialAccount(supa, id);
    if (accountError) return NextResponse.json({ error: "Gagal memeriksa akun WhatsApp." }, { status: 500 });
    if (!account || !canManageSocialAccount(actor, account)) {
      return NextResponse.json({ error: "Akun tidak ditemukan atau di luar cakupan akses Anda." }, { status: 404 });
    }

    try {
      const { error } = await supa
        .from("organization_social_accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Kanal berhasil dihapus." });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
}


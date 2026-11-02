import { getAdminClient } from "@/lib/supabaseAdmin";
import { daftarGrup, sendWa, sendChannelWa } from "@/lib/fonnte";

/**
 * Resolusi target distribusi WhatsApp (Channels dan Groups) secara hierarkis:
 * Kampus (Universitas) -> Provinsi -> Nasional/Fallback.
 */
export async function resolveListingWhatsAppTargets(listing, adminSettings = {}) {
  const universityId = listing?.university_id || (listing?.campus && listing.campus !== "Semua" ? listing.campus.toLowerCase() : null);
  const supa = getAdminClient();

  const targets = {
    channels: new Set(),
    groups: new Set(),
    resolvedCampus: listing?.campus || "Semua",
    universityId: universityId || null,
    provinceId: null,
    sources: [],
  };

  // 1. Ambil data provinsi jika ada universityId
  if (universityId && supa) {
    try {
      const { data: univ } = await supa
        .from("universities")
        .select("id, code, province_id, provinces(id, name)")
        .or(`id.eq.${universityId},code.ilike.${universityId}`)
        .maybeSingle();

      if (univ) {
        targets.universityId = univ.id;
        targets.provinceId = univ.province_id;
        targets.resolvedCampus = univ.code;
      }
    } catch {
      // Fallback non-fatal
    }
  }

  // 2. Ambil akun sosial WA terdaftar di organization_social_accounts
  if (supa) {
    try {
      const orClauses = [];
      if (targets.universityId) orClauses.push(`university_id.eq.${targets.universityId}`);
      if (targets.provinceId) orClauses.push(`province_id.eq.${targets.provinceId}`);

      let query = supa
        .from("organization_social_accounts")
        .select("provider, handle, external_account_id, scope_type, university_id, province_id, status")
        .in("provider", ["whatsapp_channel", "whatsapp_group"])
        .neq("status", "inactive");

      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      }

      const { data: socialAccounts } = await query;

      for (const acc of socialAccounts || []) {
        const jid = acc.external_account_id || (acc.handle.includes("@") ? acc.handle : null);
        if (!jid) continue;

        if (acc.provider === "whatsapp_channel" && /^[a-zA-Z0-9._-]+@newsletter$/.test(jid)) {
          targets.channels.add(jid);
          targets.sources.push({ type: "channel", scope: acc.scope_type, jid });
        } else if (acc.provider === "whatsapp_group" && /^[0-9-]+@g\.us$/.test(jid)) {
          targets.groups.add(jid);
          targets.sources.push({ type: "group", scope: acc.scope_type, jid });
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Fallback ke konfigurasi legacy / global adminSettings jika belum ada target khusus
  if (targets.channels.size === 0 && adminSettings?.channelJid) {
    const raw = String(adminSettings.channelJid).trim();
    if (/^[a-zA-Z0-9._-]+@newsletter$/.test(raw)) {
      targets.channels.add(raw);
      targets.sources.push({ type: "channel", scope: "legacy_global", jid: raw });
    }
  }

  if (targets.groups.size === 0) {
    const legacyGroups = daftarGrup(adminSettings);
    for (const g of legacyGroups) {
      if (/^[0-9-]+@g\.us$/.test(g)) {
        targets.groups.add(g);
        targets.sources.push({ type: "group", scope: "legacy_global", jid: g });
      }
    }
  }

  return {
    channelJids: [...targets.channels],
    groupJids: [...targets.groups],
    resolvedCampus: targets.resolvedCampus,
    universityId: targets.universityId,
    provinceId: targets.provinceId,
    sources: targets.sources,
  };
}

/**
 * Eksekusi distribusi listing ke target multi-channel WhatsApp yang telah terisolasi.
 */
export async function distributeListingToWhatsApp(listing, adminSettings = {}) {
  const targets = await resolveListingWhatsAppTargets(listing, adminSettings);
  const results = {
    ok: true,
    channels: [],
    groups: [],
    targets,
  };

  // Pesan publikasi katalog
  const msg = [
    `📢 *Katalog Baru: ${targets.resolvedCampus}*`,
    `📌 *${listing.title}*`,
    `💰 *Harga:* Rp ${Number(listing.price || 0).toLocaleString("id-ID")}`,
    listing.description ? `📝 ${String(listing.description).slice(0, 150)}...` : "",
    "",
    `🌐 Lihat & Pesan: ${process.env.NEXT_PUBLIC_SITE_URL || "https://www.kampuskita.my.id"}/produk/${listing.id}`,
  ].filter(Boolean).join("\n");

  // 1. Publikasi ke Saluran WhatsApp (Newsletters)
  for (const channelJid of targets.channelJids) {
    try {
      const res = await sendChannelWa(channelJid, msg, { listingId: listing.id });
      results.channels.push({ jid: channelJid, ok: !!res?.ok, error: res?.error || null });
    } catch (err) {
      results.channels.push({ jid: channelJid, ok: false, error: err.message });
    }
  }

  // 2. Publikasi ke Grup WhatsApp Komunitas
  for (const groupJid of targets.groupJids) {
    try {
      const res = await sendWa(groupJid, msg, listing.image_url || null, null, {
        jenis: "grup",
        listingId: listing.id,
      });
      results.groups.push({ jid: groupJid, ok: !!res?.ok, error: res?.galat || res?.error || null });
    } catch (err) {
      results.groups.push({ jid: groupJid, ok: false, error: err.message });
    }
  }

  return results;
}

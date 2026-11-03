import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa, sendChannelWa } from "@/lib/fonnte";
import { formatInstagramPrice } from "@/lib/listingInstagramImage";
import { buildSlug } from "@/lib/slug";
import { postToInstagram } from "@/lib/meta";
import { getInstagramAccountToken } from "@/lib/instagramAccountCredentials";

/**
 * Pembuat template caption dinamis berdasarkan kanal, universitas, provinsi, dan kategori.
 */
export function buildOmnichannelCaption(listing, channelType, { origin = "https://www.kampuskita.my.id", university = null, province = null } = {}) {
  const univCode = (university?.code || listing?.campus || "Kampus").toUpperCase();
  const univName = university?.name || univCode;
  const provName = province?.name || "Indonesia";
  const slug = buildSlug(listing.title, listing.id);
  const publicUrl = `${origin}/produk/${slug}`;
  const priceFormatted = formatInstagramPrice(listing.price);
  const desc = String(listing.description || "").trim().slice(0, 500);

  // Hashtag dinamis berbasis wilayah & kampus
  const cleanUnivTag = univCode.replace(/[^a-zA-Z0-9]/g, "");
  const cleanProvTag = provName.replace(/[^a-zA-Z0-9]/g, "");
  const tags = `#JualBeliDiKampus #${cleanUnivTag} #${cleanProvTag} #JualBeli${cleanUnivTag} #MarketplaceKampus`;

  if (channelType === "instagram_university" || channelType === "instagram_province") {
    return [
      `📢 ${listing.title}`,
      "",
      `💰 Harga: ${priceFormatted}`,
      `🏛️ Kampus: ${univName}`,
      `📍 Wilayah: ${provName}`,
      `🏷️ Kategori: ${listing.category || "Umum"}`,
      `📦 Kondisi: ${listing.condition === "new" ? "Baru" : "Preloved"}`,
      desc ? `\n📝 Deskripsi:\n${desc}` : "",
      "",
      `🔗 Cek detail & hubungi penjual:\n${publicUrl}`,
      "",
      tags,
    ].filter((line) => line !== null && line !== undefined).join("\n").slice(0, 2200);
  }

  if (channelType === "whatsapp_channel_university" || channelType === "whatsapp_channel_province") {
    return [
      `📢 *Katalog Baru ${univCode}*`,
      `📌 *${listing.title}*`,
      `💰 *Harga:* ${priceFormatted}`,
      `🏷️ *Kategori:* ${listing.category || "Umum"}`,
      `📍 *Lokasi:* ${[listing.campus, listing.area].filter(Boolean).join(" · ") || univName}`,
      desc ? `\n_${desc}_\n` : "",
      `🌐 *Lihat & Pesan:* ${publicUrl}`,
      "",
      `_JualBeliDiKampus • Jaringan Social Commerce Kampus Nasional_`,
    ].filter((line) => line !== null && line !== undefined).join("\n");
  }

  // whatsapp_group_community / default
  return [
    `📢 *[BURSA KAMPUS] ${listing.title}*`,
    `💰 *Harga:* ${priceFormatted}`,
    `🏛️ *Kampus:* ${univName}`,
    `📍 *Lokasi:* ${[listing.campus, listing.area].filter(Boolean).join(" · ") || "Area Kampus"}`,
    desc ? `📝 ${desc.slice(0, 160)}...` : "",
    "",
    `👉 *Detail & Transaksi Aman:* ${publicUrl}`,
    `⚠️ _Tips Aman: Utamakan COD di area ramai kampus & jangan transfer sebelum cek barang._`,
  ].filter(Boolean).join("\n");
}

/**
 * Resolusi seluruh target saluran omnichannel (Website, IG, WA Channels, WA Groups)
 * berdasarkan listing dan data relasional organisasi kampus.
 */
export async function resolveOmnichannelTargets(listing, { origin = "https://www.kampuskita.my.id" } = {}) {
  const supa = getAdminClient();
  let university = null;
  let province = null;
  const univIdentifier = listing?.university_id || (listing?.campus && listing.campus !== "Semua" ? listing.campus.toLowerCase() : null);

  if (supa && univIdentifier) {
    try {
      const { data: u } = await supa
        .from("universities")
        .select("id, code, name, province_id, provinces(id, name)")
        .or(`id.eq.${univIdentifier},code.ilike.${univIdentifier}`)
        .maybeSingle();

      if (u) {
        university = { id: u.id, code: u.code, name: u.name };
        if (u.provinces) {
          province = { id: u.provinces.id, name: u.provinces.name };
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // Ambil akun sosial terdaftar yang relevan
  let socialAccounts = [];
  if (supa) {
    try {
      const orClauses = [];
      if (university?.id) orClauses.push(`university_id.eq.${university.id}`);
      if (province?.id) orClauses.push(`province_id.eq.${province.id}`);

      let query = supa
        .from("organization_social_accounts")
        .select("id, provider, handle, external_account_id, scope_type, university_id, province_id, status")
        .neq("status", "inactive");

      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      }

      const { data: accs } = await query;
      socialAccounts = accs || [];
    } catch {
      // Non-fatal
    }
  }

  // Petakan kandidat kanal
  const channels = [
    {
      channelType: "website",
      name: "Website Resmi",
      scope: "national",
      targetDestination: `${origin}/produk/${buildSlug(listing.title, listing.id)}`,
      socialAccountId: null,
      available: true,
      defaultSelected: true,
      caption: null,
    },
  ];

  // Instagram Universitas
  const igUniv = socialAccounts.find((a) => a.provider === "instagram" && a.scope_type === "university");
  if (igUniv) {
    const instagramReady = igUniv.status === "connected" && /^\d{5,40}$/.test(String(igUniv.external_account_id || "")) &&
      Boolean(await getInstagramAccountToken(supa, igUniv));
    channels.push({
      channelType: "instagram_university",
      name: `Instagram Kampus (@${igUniv.handle.replace(/^@/, "")})`,
      scope: "university",
      targetDestination: igUniv.handle,
      socialAccountId: igUniv.id,
      available: instagramReady,
      availabilityReason: instagramReady ? null : "Akun ini belum terhubung ke antrean publikasi Instagram yang aktif.",
      defaultSelected: instagramReady,
      caption: buildOmnichannelCaption(listing, "instagram_university", { origin, university, province }),
    });
  }

  // Instagram Provinsi
  const igProv = socialAccounts.find((a) => a.provider === "instagram" && a.scope_type === "province");
  if (igProv) {
    const instagramReady = igProv.status === "connected" && /^\d{5,40}$/.test(String(igProv.external_account_id || "")) &&
      Boolean(await getInstagramAccountToken(supa, igProv));
    channels.push({
      channelType: "instagram_province",
      name: `Instagram Provinsi (@${igProv.handle.replace(/^@/, "")})`,
      scope: "province",
      targetDestination: igProv.handle,
      socialAccountId: igProv.id,
      available: instagramReady,
      availabilityReason: instagramReady ? null : "Akun ini belum terhubung ke antrean publikasi Instagram yang aktif.",
      defaultSelected: false, // opsional/produk unggulan
      caption: buildOmnichannelCaption(listing, "instagram_province", { origin, university, province }),
    });
  }

  // WhatsApp Channel Universitas
  const waChanUniv = socialAccounts.find((a) => a.provider === "whatsapp_channel" && a.scope_type === "university");
  if (waChanUniv) {
    const channelJid = waChanUniv.external_account_id || (/^\d{5,40}@newsletter$/.test(waChanUniv.handle) ? waChanUniv.handle : "");
    const channelReady = waChanUniv.status === "connected" && /^\d{5,40}@newsletter$/.test(channelJid);
    channels.push({
      channelType: "whatsapp_channel_university",
      name: `WhatsApp Channel Kampus (${waChanUniv.handle})`,
      scope: "university",
      targetDestination: channelJid || waChanUniv.handle,
      socialAccountId: waChanUniv.id,
      available: channelReady,
      availabilityReason: channelReady ? null : "Saluran belum terverifikasi dan terhubung.",
      defaultSelected: channelReady,
      caption: buildOmnichannelCaption(listing, "whatsapp_channel_university", { origin, university, province }),
    });
  }

  // WhatsApp Channel Provinsi
  const waChanProv = socialAccounts.find((a) => a.provider === "whatsapp_channel" && a.scope_type === "province");
  if (waChanProv) {
    const channelJid = waChanProv.external_account_id || (/^\d{5,40}@newsletter$/.test(waChanProv.handle) ? waChanProv.handle : "");
    const channelReady = waChanProv.status === "connected" && /^\d{5,40}@newsletter$/.test(channelJid);
    channels.push({
      channelType: "whatsapp_channel_province",
      name: `WhatsApp Channel Provinsi (${waChanProv.handle})`,
      scope: "province",
      targetDestination: channelJid || waChanProv.handle,
      socialAccountId: waChanProv.id,
      available: channelReady,
      availabilityReason: channelReady ? null : "Saluran belum terverifikasi dan terhubung.",
      defaultSelected: false,
      caption: buildOmnichannelCaption(listing, "whatsapp_channel_province", { origin, university, province }),
    });
  }

  // WhatsApp Group Komunitas
  const waGroup = socialAccounts.find((a) => a.provider === "whatsapp_group");
  if (waGroup) {
    const groupJid = waGroup.external_account_id || (/^\d{5,40}(?:-\d{1,30})?@g\.us$/.test(waGroup.handle) ? waGroup.handle : "");
    const groupReady = waGroup.status === "connected" && /^\d{5,40}(?:-\d{1,30})?@g\.us$/.test(groupJid);
    channels.push({
      channelType: "whatsapp_group_community",
      name: `WhatsApp Group Komunitas (${waGroup.handle})`,
      scope: waGroup.scope_type,
      targetDestination: groupJid || waGroup.handle,
      socialAccountId: waGroup.id,
      available: groupReady,
      availabilityReason: groupReady ? null : "Grup belum terverifikasi dan terhubung.",
      defaultSelected: groupReady,
      caption: buildOmnichannelCaption(listing, "whatsapp_group_community", { origin, university, province }),
    });
  }

  return {
    university,
    province,
    channels,
  };
}

/**
 * Mengeset rencana distribusi omnichannel untuk suatu produk (Scheduled atau Immediate).
 */
export async function createOmnichannelDistributionPlans(listingId, plans = [], { actorId = null, scheduledAt = null } = {}) {
  const supa = getAdminClient();
  if (!supa) throw new Error("Database client not available");

  const results = [];
  const status = scheduledAt && new Date(scheduledAt) > new Date() ? "scheduled" : "approved";

  for (const plan of plans) {
    const payload = {
      listing_id: listingId,
      channel_type: plan.channelType,
      social_account_id: plan.socialAccountId || null,
      target_destination: plan.targetDestination || null,
      province_id: plan.provinceId || null,
      university_id: plan.universityId || null,
      status,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      caption_snapshot: plan.caption || null,
      created_by: actorId,
      updated_at: new Date().toISOString(),
    };

    let existingQuery = supa
      .from("omnichannel_distributions")
      .select("id")
      .eq("listing_id", listingId)
      .eq("channel_type", plan.channelType);
    existingQuery = payload.target_destination == null
      ? existingQuery.is("target_destination", null)
      : existingQuery.eq("target_destination", payload.target_destination);
    const { data: existing, error: lookupError } = await existingQuery.maybeSingle();
    if (lookupError) throw lookupError;

    // The database uniqueness index normalizes NULL with coalesce(), which
    // PostgREST cannot target as an ON CONFLICT column list. Resolve the row
    // directly, then update or insert using the same canonical destination.
    const writeQuery = existing
      ? supa.from("omnichannel_distributions").update(payload).eq("id", existing.id)
      : supa.from("omnichannel_distributions").insert(payload);
    const { data, error } = await writeQuery.select().maybeSingle();

    if (error) {
      console.error("[createOmnichannelDistributionPlans] Upsert error:", error);
      throw error;
    }
    results.push(data);
  }

  return results;
}

/**
 * Eksekusi job distribusi omnichannel tertentu.
 */
export async function executeOmnichannelPublish(distributionId, { origin = "https://www.kampuskita.my.id" } = {}) {
  const supa = getAdminClient();
  if (!supa) throw new Error("Database client not available");

  const { data: job, error: jobErr } = await supa
    .from("omnichannel_distributions")
    .select("*, listings(*), organization_social_accounts(id,provider,status,scope_type,scope_id,handle,external_account_id)")
    .eq("id", distributionId)
    .single();

  if (jobErr || !job) {
    throw new Error("Job distribusi tidak ditemukan");
  }

  const listing = job.listings;
  if (!listing) {
    throw new Error("Listing terkait tidak ditemukan");
  }

  let account = job.organization_social_accounts;
  if (Array.isArray(account)) account = account[0] || null;
  let target = job.target_destination;
  if (job.channel_type !== "website") {
    if (!account || account.status !== "connected") throw new Error("Akun sosial tidak aktif atau sudah tidak terhubung.");
    const expectedProvider = job.channel_type.startsWith("instagram") ? "instagram" :
      job.channel_type.startsWith("whatsapp_channel") ? "whatsapp_channel" : "whatsapp_group";
    if (account.provider !== expectedProvider) throw new Error("Jenis akun sosial tidak cocok dengan pekerjaan distribusi.");
    if ((account.scope_type === "province" && account.scope_id !== job.province_id) ||
        (account.scope_type === "university" && account.scope_id !== job.university_id)) {
      throw new Error("Cakupan akun sosial tidak cocok dengan pekerjaan distribusi.");
    }
    const canonicalDestination = expectedProvider === "instagram"
      ? account.handle
      : account.external_account_id || account.handle;
    if (!canonicalDestination || canonicalDestination !== job.target_destination) {
      throw new Error("Tujuan distribusi berbeda dari akun sosial yang tersimpan.");
    }
    target = expectedProvider === "instagram" ? account.external_account_id : canonicalDestination;
    if (expectedProvider === "whatsapp_channel" && !/^\d{5,40}@newsletter$/.test(target)) throw new Error("JID WhatsApp Channel belum valid.");
    if (expectedProvider === "whatsapp_group" && !/^\d{5,40}(?:-\d{1,30})?@g\.us$/.test(target)) throw new Error("JID grup WhatsApp belum valid.");
    if (expectedProvider === "instagram" && !/^\d{5,40}$/.test(String(target || ""))) throw new Error("ID akun Instagram belum valid.");
  }

  // Claim the job atomically so overlapping cron invocations cannot publish
  // the same WhatsApp message twice.
  const { data: claimed, error: claimError } = await supa
    .from("omnichannel_distributions")
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("id", distributionId)
    .in("status", ["approved", "scheduled", "failed"])
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return { ok: false, skipped: true, error: "Pekerjaan sudah diproses atau tidak lagi siap diterbitkan." };

  try {
    let externalRef = null;

    if (job.channel_type === "website") {
      // Pastikan status listing aktif
      const { error: listingError } = await supa
        .from("listings")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", listing.id);
      if (listingError) throw new Error("Listing gagal diaktifkan di website.");
      externalRef = listing.id;
    } else if (job.channel_type === "whatsapp_channel_university" || job.channel_type === "whatsapp_channel_province") {
      const jid = target;
      const caption = job.caption_snapshot || buildOmnichannelCaption(listing, job.channel_type, { origin });
      const res = await sendChannelWa(jid, caption, { listingId: listing.id });
      if (!res?.ok) {
        throw new Error(res?.error || "Gagal mengirim ke Saluran WhatsApp");
      }
      externalRef = res?.id || res?.key?.id || "wa_chan_ok";
    } else if (job.channel_type === "whatsapp_group_community") {
      const jid = target;
      const caption = job.caption_snapshot || buildOmnichannelCaption(listing, job.channel_type, { origin });
      const res = await sendWa(jid, caption, listing.image_url || null, null, {
        jenis: "grup",
        listingId: listing.id,
      });
      if (!res?.ok) {
        throw new Error(res?.galat || res?.error || "Gagal mengirim ke WhatsApp Group");
      }
      externalRef = res?.id || res?.key?.id || "wa_grp_ok";
    } else if (job.channel_type === "instagram_university" || job.channel_type === "instagram_province") {
      const token = await getInstagramAccountToken(supa, account);
      if (!token) throw new Error("Token Meta belum disiapkan untuk akun Instagram ini.");
      const caption = job.caption_snapshot || buildOmnichannelCaption(listing, job.channel_type, { origin });
      const mediaUrl = `${origin}/api/listings/${listing.id}/instagram-image`;
      const result = await postToInstagram(target, token, mediaUrl, caption);
      externalRef = result?.id || result?.creation_id || null;
      if (!externalRef) throw new Error("Meta tidak mengembalikan ID publikasi Instagram.");
    }

    // Hanya tandai sukses setelah Meta mengembalikan referensi publikasi.
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supa
      .from("omnichannel_distributions")
      .update({
        status: "published",
        published_at: now,
        external_reference_id: externalRef,
        last_error: null,
        updated_at: now,
      })
      .eq("id", distributionId)
      .select()
      .single();
    if (updateError) throw updateError;

    return { ok: true, job: updated };
  } catch (err) {
    console.error(`[executeOmnichannelPublish] Error publishing job ${distributionId}:`, err);
    const nextAttempts = (job.attempts || 0) + 1;
    const isMax = nextAttempts >= (job.max_attempts || 3);
    const now = new Date().toISOString();

    const { data: failedJob } = await supa
      .from("omnichannel_distributions")
      .update({
        status: "failed",
        attempts: nextAttempts,
        last_error: err.message || "Gagal mempublikasikan ke channel",
        updated_at: now,
      })
      .eq("id", distributionId)
      .select()
      .single();

    return { ok: false, error: err.message, job: failedJob, isMaxAttempts: isMax };
  }
}

/**
 * Uji coba kembali (Retry) distribusi yang gagal.
 */
export async function retryOmnichannelDistribution(distributionId, { origin } = {}) {
  const supa = getAdminClient();
  if (!supa) throw new Error("Database client not available");

  await supa
    .from("omnichannel_distributions")
    .update({ status: "approved", last_error: null, updated_at: new Date().toISOString() })
    .eq("id", distributionId);

  return executeOmnichannelPublish(distributionId, { origin });
}

/**
 * Mengambil log distribusi per channel untuk satu listing.
 */
export async function getListingDistributionLogs(listingId) {
  const supa = getAdminClient();
  if (!supa) return [];

  const { data } = await supa
    .from("omnichannel_distributions")
    .select(`
      id,
      channel_type,
      target_destination,
      status,
      scheduled_at,
      published_at,
      attempts,
      max_attempts,
      last_error,
      external_reference_id,
      created_at,
      updated_at,
      provinces(id, name),
      universities(id, code, name),
      organization_social_accounts(id, provider, handle)
    `)
    .eq("listing_id", listingId)
    .order("created_at", { ascending: true });

  return data || [];
}

/**
 * Background runner untuk memproses pekerjaan terjadwal (Scheduled)
 * yang waktu siarannya sudah tiba (`scheduled_at <= now()`).
 */
export async function processScheduledOmnichannelJobs({ origin = "https://www.kampuskita.my.id", limit = 10 } = {}) {
  const supa = getAdminClient();
  if (!supa) return { processed: 0, results: [] };

  const now = new Date().toISOString();
  const { data: dueJobs, error } = await supa
    .from("omnichannel_distributions")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error("Gagal membaca antrean distribusi terjadwal.");

  if (!dueJobs || dueJobs.length === 0) {
    return { processed: 0, results: [] };
  }

  const results = [];
  for (const job of dueJobs) {
    const res = await executeOmnichannelPublish(job.id, { origin });
    results.push(res);
  }

  return { processed: dueJobs.length, results };
}


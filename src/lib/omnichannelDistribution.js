import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa, sendChannelWa } from "@/lib/fonnte";
import { formatInstagramPrice } from "@/lib/listingInstagramImage";
import { buildSlug } from "@/lib/slug";

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
    channels.push({
      channelType: "instagram_university",
      name: `Instagram Kampus (@${igUniv.handle.replace(/^@/, "")})`,
      scope: "university",
      targetDestination: igUniv.handle,
      socialAccountId: igUniv.id,
      available: true,
      defaultSelected: true,
      caption: buildOmnichannelCaption(listing, "instagram_university", { origin, university, province }),
    });
  }

  // Instagram Provinsi
  const igProv = socialAccounts.find((a) => a.provider === "instagram" && a.scope_type === "province");
  if (igProv) {
    channels.push({
      channelType: "instagram_province",
      name: `Instagram Provinsi (@${igProv.handle.replace(/^@/, "")})`,
      scope: "province",
      targetDestination: igProv.handle,
      socialAccountId: igProv.id,
      available: true,
      defaultSelected: false, // opsional/produk unggulan
      caption: buildOmnichannelCaption(listing, "instagram_province", { origin, university, province }),
    });
  }

  // WhatsApp Channel Universitas
  const waChanUniv = socialAccounts.find((a) => a.provider === "whatsapp_channel" && a.scope_type === "university");
  if (waChanUniv) {
    channels.push({
      channelType: "whatsapp_channel_university",
      name: `WhatsApp Channel Kampus (${waChanUniv.handle})`,
      scope: "university",
      targetDestination: waChanUniv.external_account_id || waChanUniv.handle,
      socialAccountId: waChanUniv.id,
      available: true,
      defaultSelected: true,
      caption: buildOmnichannelCaption(listing, "whatsapp_channel_university", { origin, university, province }),
    });
  }

  // WhatsApp Channel Provinsi
  const waChanProv = socialAccounts.find((a) => a.provider === "whatsapp_channel" && a.scope_type === "province");
  if (waChanProv) {
    channels.push({
      channelType: "whatsapp_channel_province",
      name: `WhatsApp Channel Provinsi (${waChanProv.handle})`,
      scope: "province",
      targetDestination: waChanProv.external_account_id || waChanProv.handle,
      socialAccountId: waChanProv.id,
      available: true,
      defaultSelected: false,
      caption: buildOmnichannelCaption(listing, "whatsapp_channel_province", { origin, university, province }),
    });
  }

  // WhatsApp Group Komunitas
  const waGroup = socialAccounts.find((a) => a.provider === "whatsapp_group");
  if (waGroup) {
    channels.push({
      channelType: "whatsapp_group_community",
      name: `WhatsApp Group Komunitas (${waGroup.handle})`,
      scope: waGroup.scope_type,
      targetDestination: waGroup.external_account_id || waGroup.handle,
      socialAccountId: waGroup.id,
      available: true,
      defaultSelected: true,
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

    const { data, error } = await supa
      .from("omnichannel_distributions")
      .upsert(payload, { onConflict: "listing_id,channel_type,target_destination" })
      .select()
      .maybeSingle();

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
    .select("*, listings(*)")
    .eq("id", distributionId)
    .single();

  if (jobErr || !job) {
    throw new Error("Job distribusi tidak ditemukan");
  }

  const listing = job.listings;
  if (!listing) {
    throw new Error("Listing terkait tidak ditemukan");
  }

  // Update status ke 'publishing'
  await supa
    .from("omnichannel_distributions")
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("id", distributionId);

  try {
    let externalRef = null;

    if (job.channel_type === "website") {
      // Pastikan status listing aktif
      await supa
        .from("listings")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", listing.id);
      externalRef = listing.id;
    } else if (job.channel_type === "whatsapp_channel_university" || job.channel_type === "whatsapp_channel_province") {
      const jid = job.target_destination;
      const caption = job.caption_snapshot || buildOmnichannelCaption(listing, job.channel_type, { origin });
      const res = await sendChannelWa(jid, caption, { listingId: listing.id });
      if (!res?.ok) {
        throw new Error(res?.error || "Gagal mengirim ke Saluran WhatsApp");
      }
      externalRef = res?.id || res?.key?.id || "wa_chan_ok";
    } else if (job.channel_type === "whatsapp_group_community") {
      const jid = job.target_destination;
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
      // Masukkan ke antrean publikasi Instagram
      const { queueListingInstagram } = await import("@/lib/listingInstagram");
      await queueListingInstagram(listing.id, { supa });
      externalRef = `ig_queued_${listing.id}`;
    }

    // Sukses: tandai status published
    const now = new Date().toISOString();
    const { data: updated } = await supa
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
  const { data: dueJobs } = await supa
    .from("omnichannel_distributions")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

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


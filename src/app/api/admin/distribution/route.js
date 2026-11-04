import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import {
  resolveOmnichannelTargets,
  createOmnichannelDistributionPlans,
  executeOmnichannelPublish,
  retryOmnichannelDistribution,
  getListingDistributionLogs,
  processScheduledOmnichannelJobs,
} from "@/lib/omnichannelDistribution";
import { canManageSocialScope, getSocialScope } from "@/lib/socialAccountAccess";

export const dynamic = "force-dynamic";

async function getListingScope(supa, listing) {
  if (listing?.universities?.id || listing?.university_id) {
    const scope = await getSocialScope(supa, { universityId: listing.universities?.id || listing.university_id });
    if (scope) return scope;
  }
  const campus = String(listing?.campus || "").trim();
  if (campus && campus.toLowerCase() !== "semua") {
    let { data } = await supa.from("universities")
      .select("id,code,province_id")
      .eq("id", campus.toLowerCase())
      .maybeSingle();
    if (!data) {
      ({ data } = await supa.from("universities")
        .select("id,code,province_id")
        .eq("code", campus.toUpperCase())
        .maybeSingle());
    }
    if (data) return { scope_type: "university", university_id: data.id, university_code: data.code, university_province_id: data.province_id };
  }
  return null;
}

async function loadAuthorizedListing(supa, actor, listingId) {
  const { data: listing, error } = await supa.from("listings")
    .select("id,title,description,price,category,condition,campus,university_id,image_url,images,status,universities(id,code,province_id)")
    .eq("id", listingId)
    .maybeSingle();
  if (error || !listing) return { listing: null, response: NextResponse.json({ error: "Listing tidak ditemukan." }, { status: 404 }) };
  const scope = await getListingScope(supa, listing);
  if (actor.role !== "superadmin" && !canManageSocialScope(actor, scope)) {
    return { listing: null, response: NextResponse.json({ error: "Listing berada di luar cakupan wilayah Anda." }, { status: 404 }) };
  }
  return { listing, scope };
}

/**
 * GET /api/admin/distribution
 * Mengambil matriks target omnichannel untuk produk tertentu ATAU daftar job distribusi nasional per scope.
 */
export async function GET(req) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed =
    actor.role === "superadmin" ||
    hasAdminPermission(actor, "social", "read") ||
    hasAdminPermission(actor, "content", "read") ||
    hasAdminPermission(actor, "marketplace", "read");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");
  const statusFilter = searchParams.get("status");
  const supa = getAdminClient();

  try {
    // 1. Jika query spesifik listing: Ambil matriks channel dan log distribusi produk tersebut
    if (listingId) {
      const { listing, response } = await loadAuthorizedListing(supa, actor, listingId);
      if (response) return response;

      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "https://www.kampuskita.my.id";
      const matrix = await resolveOmnichannelTargets(listing, { origin });
      const logs = await getListingDistributionLogs(listingId);

      return NextResponse.json({
        ok: true,
        listing,
        matrix,
        logs,
      });
    }

    // 2. Jika query daftar job distribusi sistem / antrean
    let query = supa
      .from("omnichannel_distributions")
      .select(`
        id,
        listing_id,
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
        listings(id, title, price, campus, category, image_url, university_id, universities(id, code, province_id)),
        provinces(id, name),
        universities(id, code, name)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: jobs, error } = await query;
    if (error) throw error;

    const filteredJobs = [];
    for (const job of jobs || []) {
      if (actor.role === "superadmin") {
        filteredJobs.push(job);
      } else if (job.listings) {
        const scope = await getListingScope(supa, job.listings);
        if (canManageSocialScope(actor, scope)) filteredJobs.push(job);
      }
    }

    return NextResponse.json({
      ok: true,
      jobs: filteredJobs,
      totalCount: filteredJobs.length,
    });
  } catch (err) {
    console.error("[GET /api/admin/distribution] Error:", err);
    return NextResponse.json({ error: "Gagal mengambil data distribusi: " + err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/distribution
 * Mengelola perencanaan, penjadwalan, eksekusi, dan retry distribusi omnichannel.
 */
export async function POST(req) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed =
    actor.role === "superadmin" ||
    hasAdminPermission(actor, "social", "write") ||
    hasAdminPermission(actor, "content", "write") ||
    hasAdminPermission(actor, "marketplace", "write");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body;
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "https://www.kampuskita.my.id";

  try {
    // 1. Publikasi langsung atau jadwalkan ke channel-channel terpilih
    if (action === "publish_channels" || action === "schedule_channels") {
      const { listingId, channels = [], scheduledAt = null } = body;
      if (!listingId || !Array.isArray(channels) || channels.length === 0 || channels.length > 12) {
        return NextResponse.json({ error: "Listing ID dan minimal 1 kanal wajib dipilih." }, { status: 400 });
      }

      const supa = getAdminClient();
      const { listing, scope, response } = await loadAuthorizedListing(supa, actor, listingId);
      if (response) return response;
      if (listing.status !== "active") {
        return NextResponse.json(
          { error: "Hanya iklan aktif yang dapat dipublikasikan atau dijadwalkan." },
          { status: 409 }
        );
      }
      const { channels: availableChannels } = await resolveOmnichannelTargets(listing, { origin });
      const canonicalPlans = [];
      for (const requested of channels) {
        const canonical = availableChannels.find((candidate) =>
          candidate.channelType === requested.channelType &&
          (candidate.channelType === "website" || candidate.socialAccountId === requested.socialAccountId)
        );
        if (!canonical || !canonical.available) {
          return NextResponse.json({ error: "Salah satu kanal tidak aktif atau tidak sesuai dengan listing ini." }, { status: 409 });
        }
        canonicalPlans.push({
          channelType: canonical.channelType,
          socialAccountId: canonical.socialAccountId,
          targetDestination: canonical.targetDestination,
          provinceId: canonical.scope === "province" ? scope?.province_id || scope?.university_province_id || null : null,
          universityId: canonical.scope === "university" ? scope?.university_id || null : null,
          caption: typeof requested.caption === "string" ? requested.caption.trim().slice(0, 2200) : canonical.caption,
        });
      }
      if (action === "schedule_channels" && (!scheduledAt || !Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt) <= Date.now())) {
        return NextResponse.json({ error: "Waktu penjadwalan harus berupa waktu mendatang yang valid." }, { status: 400 });
      }

      const createdJobs = await createOmnichannelDistributionPlans(listingId, canonicalPlans, {
        actorId: actor.userId,
        scheduledAt: action === "schedule_channels" ? scheduledAt : null,
      });

      // Jika publish_channels langsung (bukan terjadwal), eksekusi satu per satu sekarang
      const executionResults = [];
      if (action === "publish_channels") {
        for (const job of createdJobs) {
          const res = await executeOmnichannelPublish(job.id, { origin });
          executionResults.push(res);
        }
      }

      return NextResponse.json({
        ok: true,
        message:
          action === "schedule_channels"
            ? `Pekerjaan publikasi berhasil dijadwalkan ke ${canonicalPlans.length} kanal.`
            : `Pekerjaan distribusi berhasil diproses ke ${canonicalPlans.length} kanal.`,
        jobs: createdJobs,
        executions: executionResults,
      });
    }

    // 2. Retry job yang gagal
    if (action === "retry_job") {
      const { distributionId } = body;
      if (!distributionId) {
        return NextResponse.json({ error: "Distribution ID wajib disertakan." }, { status: 400 });
      }
      const supa = getAdminClient();
      const { data: job, error } = await supa.from("omnichannel_distributions")
        .select("id,status,listings(id,campus,university_id,universities(id,code,province_id))")
        .eq("id", distributionId).maybeSingle();
      if (error || !job?.listings) return NextResponse.json({ error: "Pekerjaan distribusi tidak ditemukan." }, { status: 404 });
      if (job.status !== "failed") return NextResponse.json({ error: "Hanya pekerjaan yang gagal yang dapat dicoba ulang." }, { status: 409 });
      const scope = await getListingScope(supa, job.listings);
      if (actor.role !== "superadmin" && !canManageSocialScope(actor, scope)) return NextResponse.json({ error: "Pekerjaan berada di luar cakupan Anda." }, { status: 404 });
      const res = await retryOmnichannelDistribution(distributionId, { origin });
      return NextResponse.json({ ok: res.ok, result: res });
    }

    // 3. Batalkan jadwal publikasi
    if (action === "cancel_job") {
      const { distributionId } = body;
      const supa = getAdminClient();
      const { data: job, error: lookupError } = await supa.from("omnichannel_distributions")
        .select("id,channel_type,status,listings(id,campus,university_id,universities(id,code,province_id))")
        .eq("id", distributionId).maybeSingle();
      if (lookupError || !job?.listings) return NextResponse.json({ error: "Pekerjaan distribusi tidak ditemukan." }, { status: 404 });
      const scope = await getListingScope(supa, job.listings);
      if (actor.role !== "superadmin" && !canManageSocialScope(actor, scope)) return NextResponse.json({ error: "Pekerjaan berada di luar cakupan Anda." }, { status: 404 });

      if (job.status === "pending_review" && job.channel_type.startsWith("instagram_")) {
        // Instagram jobs hand off to a separate queue. Remove only a still
        // queued publication; a worker that has already claimed it cannot be
        // cancelled safely and must finish or fail visibly.
        const { data: removed, error: queueError } = await supa
          .from("listing_instagram_publications")
          .delete()
          .eq("listing_id", job.listings.id)
          .eq("status", "queued")
          .select("id")
          .maybeSingle();
        if (queueError) throw queueError;
        if (!removed) return NextResponse.json({ error: "Publikasi Instagram sudah diproses atau tidak lagi berada dalam antrean. Pembatalan ditolak agar status tidak menyesatkan." }, { status: 409 });
      }

      const { data: cancelled, error } = await supa
        .from("omnichannel_distributions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", distributionId)
        .in("status", ["scheduled", "approved", "pending_review"])
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!cancelled) return NextResponse.json({ error: "Pekerjaan tidak ditemukan atau sudah tidak dapat dibatalkan." }, { status: 409 });
      return NextResponse.json({ ok: true, message: "Jadwal publikasi berhasil dibatalkan." });
    }

    // 4. Jalankan antrean terjadwal (cron / background trigger)
    if (action === "process_scheduled") {
      if (actor.role !== "superadmin") return NextResponse.json({ error: "Hanya superadmin yang dapat menjalankan antrean nasional." }, { status: 403 });
      const res = await processScheduledOmnichannelJobs({ origin });
      return NextResponse.json({ ok: true, processed: res.processed, results: res.results });
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/admin/distribution] Error:", err);
    return NextResponse.json({ error: "Gagal memproses distribusi: " + err.message }, { status: 500 });
  }
}

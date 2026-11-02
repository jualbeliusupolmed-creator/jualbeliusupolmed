import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission, getAdminCampusScope } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import {
  resolveOmnichannelTargets,
  createOmnichannelDistributionPlans,
  executeOmnichannelPublish,
  retryOmnichannelDistribution,
  getListingDistributionLogs,
  processScheduledOmnichannelJobs,
} from "@/lib/omnichannelDistribution";

export const dynamic = "force-dynamic";

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
      const { data: listing, error: lErr } = await supa
        .from("listings")
        .select("id, title, description, price, category, condition, campus, university_id, image_url, images, status")
        .eq("id", listingId)
        .maybeSingle();

      if (lErr || !listing) {
        return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
      }

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
    const activeCampuses = await getAdminCampusScope(actor);
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
        listings(id, title, price, campus, category, image_url),
        provinces(id, name),
        universities(id, code, name)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(50);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: jobs, count, error } = await query;
    if (error) throw error;

    // Filter scope kampus jika bukan superadmin
    const filteredJobs = (jobs || []).filter((job) => {
      if (activeCampuses.length === 0 || activeCampuses.includes("all")) return true;
      const univCode = job.universities?.code || job.listings?.campus;
      if (!univCode) return true;
      return activeCampuses.some((c) => c.toLowerCase() === univCode.toLowerCase());
    });

    return NextResponse.json({
      ok: true,
      jobs: filteredJobs,
      totalCount: count || 0,
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
      if (!listingId || channels.length === 0) {
        return NextResponse.json({ error: "Listing ID dan minimal 1 kanal wajib dipilih." }, { status: 400 });
      }

      const createdJobs = await createOmnichannelDistributionPlans(listingId, channels, {
        actorId: actor.id,
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
            ? `Berhasil menjadwalkan publikasi ke ${channels.length} kanal.`
            : `Berhasil mengeksekusi publikasi ke ${channels.length} kanal.`,
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
      const res = await retryOmnichannelDistribution(distributionId, { origin });
      return NextResponse.json({ ok: res.ok, result: res });
    }

    // 3. Batalkan jadwal publikasi
    if (action === "cancel_job") {
      const { distributionId } = body;
      const supa = getAdminClient();
      await supa
        .from("omnichannel_distributions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", distributionId);
      return NextResponse.json({ ok: true, message: "Jadwal publikasi berhasil dibatalkan." });
    }

    // 4. Jalankan antrean terjadwal (cron / background trigger)
    if (action === "process_scheduled") {
      const res = await processScheduledOmnichannelJobs({ origin });
      return NextResponse.json({ ok: true, processed: res.processed, results: res.results });
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/admin/distribution] Error:", err);
    return NextResponse.json({ error: "Gagal memproses distribusi: " + err.message }, { status: 500 });
  }
}


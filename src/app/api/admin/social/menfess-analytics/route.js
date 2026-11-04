import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { canManageSocialAccount } from "@/lib/socialAccountAccess";
import {
  resolveInstagramMenfessDateRange,
  summarizeInstagramMenfessAnalytics,
} from "@/lib/instagramMenfessAnalytics";

export const dynamic = "force-dynamic";
const ANALYTICS_ROW_LIMIT = 5000;
const SENDER_BATCH_SIZE = 200;
const SENDER_FALLBACK_CONCURRENCY = 20;

async function findPriorSenders(supa, senderIds, recipientIds, startAt) {
  const priorSenderIds = new Set();
  for (let offset = 0; offset < senderIds.length; offset += SENDER_BATCH_SIZE) {
    const batch = senderIds.slice(offset, offset + SENDER_BATCH_SIZE);
    const { data: priorEvents, count, error } = await supa.from("instagram_dm_logs")
      .select("sender_id", { count: "exact" })
      .eq("direction", "inbound")
      .eq("action_taken", "menfess_created")
      .lt("created_at", startAt)
      .in("recipient_account_id", recipientIds)
      .in("sender_id", batch)
      .limit(ANALYTICS_ROW_LIMIT);
    if (error) throw error;

    for (const event of priorEvents || []) {
      if (event.sender_id) priorSenderIds.add(String(event.sender_id));
    }

    if (Number(count || 0) <= (priorEvents || []).length) continue;

    const missingSenderIds = batch.filter((senderId) => !priorSenderIds.has(senderId));
    for (let fallbackOffset = 0; fallbackOffset < missingSenderIds.length; fallbackOffset += SENDER_FALLBACK_CONCURRENCY) {
      const fallbackBatch = missingSenderIds.slice(
        fallbackOffset,
        fallbackOffset + SENDER_FALLBACK_CONCURRENCY
      );
      const matches = await Promise.all(fallbackBatch.map(async (senderId) => {
        const { data, error: fallbackError } = await supa.from("instagram_dm_logs")
          .select("sender_id")
          .eq("direction", "inbound")
          .eq("action_taken", "menfess_created")
          .lt("created_at", startAt)
          .in("recipient_account_id", recipientIds)
          .eq("sender_id", senderId)
          .limit(1);
        if (fallbackError) throw fallbackError;
        return data?.length ? senderId : null;
      }));
      for (const senderId of matches) {
        if (senderId) priorSenderIds.add(senderId);
      }
    }
  }
  return priorSenderIds;
}

export async function GET(request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasAdminPermission(actor, "social", "read") &&
      !hasAdminPermission(actor, "analytics", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  let dateRange;
  try {
    dateRange = resolveInstagramMenfessDateRange({
      period: params.get("period") || "7d",
      from: params.get("from"),
      to: params.get("to"),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const supa = getAdminClient();
  try {
    const { data: accountRows, error: accountError } = await supa
      .from("organization_social_accounts")
      .select("id,provider,scope_type,scope_id,province_id,university_id,handle,external_account_id,universities(id,code,province_id)")
      .eq("provider", "instagram");
    if (accountError) throw accountError;

    const allowedAccounts = (accountRows || []).filter((account) =>
      canManageSocialAccount(actor, account) &&
      /^\d{5,40}$/.test(String(account.external_account_id || ""))
    );
    const accountOptions = allowedAccounts.map((account) => ({
      id: account.id,
      handle: account.handle,
    }));
    const requestedAccountId = String(params.get("accountId") || "");
    if (requestedAccountId && !allowedAccounts.some((account) => account.id === requestedAccountId)) {
      return NextResponse.json({ error: "Akun Instagram tidak ditemukan atau di luar cakupan akses Anda." }, { status: 404 });
    }

    const selectedAccounts = requestedAccountId
      ? allowedAccounts.filter((account) => account.id === requestedAccountId)
      : allowedAccounts;
    const recipientIds = [...new Set(selectedAccounts.map((account) => account.external_account_id))];
    if (!recipientIds.length) {
      return NextResponse.json({
        ok: true,
        dateRange,
        accountOptions,
        selectedAccountId: requestedAccountId || null,
        ...summarizeInstagramMenfessAnalytics({
          events: [],
          priorSenderIds: new Set(),
          dateRange,
        }),
      });
    }

    const eventQuery = supa.from("instagram_dm_logs")
      .select("sender_id,created_at", { count: "exact" })
      .eq("direction", "inbound")
      .eq("action_taken", "menfess_created")
      .gte("created_at", dateRange.startAt)
      .lt("created_at", dateRange.endAt)
      .in("recipient_account_id", recipientIds)
      .order("created_at", { ascending: true })
      .limit(ANALYTICS_ROW_LIMIT);
    const { data: events, count, error: eventError } = await eventQuery;
    if (eventError) throw eventError;

    const senderIds = [...new Set((events || [])
      .map((event) => String(event.sender_id || "").trim())
      .filter(Boolean))];
    const priorSenderIds = await findPriorSenders(
      supa,
      senderIds,
      recipientIds,
      dateRange.startAt
    );

    return NextResponse.json({
      ok: true,
      dateRange,
      accountOptions,
      selectedAccountId: requestedAccountId || null,
      ...summarizeInstagramMenfessAnalytics({
        events: events || [],
        priorSenderIds,
        dateRange,
        truncated: Number(count || 0) > ANALYTICS_ROW_LIMIT,
      }),
    });
  } catch (error) {
    console.error("[api/admin/social/menfess-analytics] Failed to load analytics.", {
      code: error?.code || "analytics_query_failed",
    });
    return NextResponse.json({ error: "Analitik Menfess belum dapat dimuat." }, { status: 503 });
  }
}

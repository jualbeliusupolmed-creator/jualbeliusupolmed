import { getAdminClient } from "@/lib/supabaseAdmin";
import { resolveInstagramOrganizationScope } from "@/lib/instagramDmAuth";

/**
 * Log Instagram DM inbound/outbound interaction with multi-tenant scope isolation.
 */
export async function logInstagramDmMessage({
  recipientAccountId,
  senderId,
  senderUsername = null,
  direction = "inbound",
  messageText = "",
  quickReplyPayload = null,
  actionTaken = null,
  listingId = null,
  status = "processed",
  metadata = {},
}) {
  // During tests, we fail silently or log in memory
  if (process.env.NODE_ENV === "test") {
    return "test-log-id";
  }

  try {
    const supa = getAdminClient();
    if (!supa) return null;

    let provinceId = metadata?.province_id || null;
    let universityId = metadata?.university_id || null;

    if (recipientAccountId && (!provinceId && !universityId)) {
      try {
        const scope = await resolveInstagramOrganizationScope(recipientAccountId);
        if (scope) {
          provinceId = scope.provinceId || null;
          universityId = scope.universityId || null;
        }
      } catch {
        // Fallback gracefully
      }
    }

    const payload = {
      recipient_account_id: String(recipientAccountId || "").trim(),
      sender_id: String(senderId || "").trim(),
      sender_username: senderUsername ? String(senderUsername).trim() : null,
      province_id: provinceId,
      university_id: universityId,
      direction,
      message_text: messageText ? String(messageText).slice(0, 4000) : null,
      quick_reply_payload: quickReplyPayload ? String(quickReplyPayload).slice(0, 1000) : null,
      action_taken: actionTaken ? String(actionTaken).slice(0, 100) : null,
      listing_id: listingId || null,
      status,
      metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supa
      .from("instagram_dm_logs")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[instagramDmLogger] Failed to insert log:", error.message);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error("[instagramDmLogger] Unexpected error logging DM:", err?.message);
    return null;
  }
}


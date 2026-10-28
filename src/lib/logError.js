import { sanitizeLogData, logger } from "./logger";

export async function logError(endpoint, error, context = {}) {
  try {
    const { getAdminClient } = await import("./supabaseAdmin");
    await getAdminClient().from("error_logs").insert({
      endpoint,
      error_message: String(sanitizeLogData(error?.message || error)).slice(0, 500),
      context: Object.keys(context).length ? sanitizeLogData(context) : null,
    });
  } catch (loggingError) {
    logger.warn("Failed to persist application error log.", {
      endpoint: String(endpoint || "").slice(0, 120),
      error: loggingError,
    });
  }
}

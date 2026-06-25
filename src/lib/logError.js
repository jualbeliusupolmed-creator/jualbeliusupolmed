export async function logError(endpoint, error, context = {}) {
  try {
    const { getAdminClient } = await import("./supabaseAdmin");
    await getAdminClient().from("error_logs").insert({
      endpoint,
      error_message: String(error?.message || error).slice(0, 500),
      context: Object.keys(context).length ? context : null,
    });
  } catch (_) {}
}

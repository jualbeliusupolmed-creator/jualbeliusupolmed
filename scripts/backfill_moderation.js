/**
 * scripts/backfill_moderation.js
 * Scans existing active listings in Jual Beli USU and evaluates them with
 * the deterministic moderation rules. Flagged items (vape/pod/liquid, illegal drugs,
 * thesis jockeying, invalid 0-price, etc.) are soft-hidden (status: 'hidden')
 * with audit trail. NEVER deletes data.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill_moderation.js [--apply]
 */

import { getAdminClient } from "../src/lib/supabaseAdmin.js";
import { evaluateModerationRules } from "../src/lib/moderationRules.js";

async function main() {
  const isApply = process.argv.includes("--apply");
  console.log(`[Backfill Moderation] Mode: ${isApply ? "APPLY (writes to DB)" : "DRY-RUN (read-only)"}`);

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (err) {
    console.error(`[Backfill Moderation] Failed to initialize Supabase admin client: ${err.message}`);
    process.exit(1);
  }

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, description, category, price, is_free, status, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Backfill Moderation] Error fetching listings:", error);
    process.exit(1);
  }

  console.log(`[Backfill Moderation] Found ${listings.length} active listings to evaluate.`);

  let flaggedCount = 0;
  let cleanCount = 0;
  const flaggedItems = [];

  for (const item of listings) {
    const result = evaluateModerationRules({
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price,
      type: item.is_free ? "gratis" : "barang",
    });

    if (result.action === "reject" || result.riskScore >= 70) {
      flaggedCount++;
      flaggedItems.push({
        id: item.id,
        title: item.title,
        price: item.price,
        action: result.action,
        riskScore: result.riskScore,
        reasons: result.reasons,
      });

      console.log(`  -> FLAGGED #${item.id} | "${item.title}" | Price: ${item.price} | Reason: ${result.reasons.join(", ")}`);

      if (isApply) {
        const { error: updateErr } = await supabase
          .from("listings")
          .update({
            status: "hidden",
            moderation_reason: `Backfill rule match: ${result.reasons.join("; ")}`,
            risk_score: result.riskScore,
            moderated_by: "system:backfill",
            moderated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (updateErr) {
          console.error(`     Failed to update listing #${item.id}:`, updateErr.message);
        } else {
          console.log(`     Updated status -> 'hidden'`);
        }
      }
    } else {
      cleanCount++;
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total scanned: ${listings.length}`);
  console.log(`Clean items  : ${cleanCount}`);
  console.log(`Flagged items: ${flaggedCount}`);
  if (!isApply && flaggedCount > 0) {
    console.log("Run with --apply to update flagged listings to status 'hidden'.");
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

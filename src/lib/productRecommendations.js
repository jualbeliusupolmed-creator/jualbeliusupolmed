import { isListingAvailable } from "@/lib/listingAvailability";
import { checkProhibitedListing } from "@/lib/profanity";
import { evaluateModerationRules } from "@/lib/moderationRules";

export function selectProductRecommendations(listing, candidates, limit = 4) {
  const selected = [];
  const seenIds = new Set([listing?.id]);

  for (const candidate of candidates) {
    if (!isListingAvailable(candidate) || seenIds.has(candidate.id)) continue;
    seenIds.add(candidate.id);

    const moderation = evaluateModerationRules({
      title: candidate.title,
      description: candidate.description,
      category: candidate.category,
      price: candidate.price,
    });
    if (
      moderation.action !== "allow" ||
      checkProhibitedListing(candidate.title, candidate.description).prohibited
    ) {
      continue;
    }

    selected.push(candidate);
    if (selected.length >= limit) break;
  }

  return selected;
}

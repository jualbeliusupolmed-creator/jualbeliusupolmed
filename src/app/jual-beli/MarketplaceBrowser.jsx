"use client";

import SuperAppHome from "@/app/SuperAppHome";

export default function MarketplaceBrowser({
  initialListings = [],
  initialPoBatches = [],
}) {
  return (
    <SuperAppHome
      latestListings={initialListings}
      initialPoBatches={initialPoBatches}
    />
  );
}

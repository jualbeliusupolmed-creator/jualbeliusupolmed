import { NextResponse } from "next/server";
import { fetchOpenPoBatches } from "@/lib/openPo";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache 1 menit

export async function GET() {
  try {
    const batches = await fetchOpenPoBatches();

    return NextResponse.json({
      success: true,
      source: "realtime",
      realCount: batches.length,
      batches,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      source: "error",
      batches: [],
      error: err.message,
    });
  }
}

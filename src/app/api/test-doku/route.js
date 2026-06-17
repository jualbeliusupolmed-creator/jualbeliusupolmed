import { NextResponse } from "next/server";
import { createDokuTransaction } from "@/lib/doku";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const tx = await createDokuTransaction({
      orderId: `TEST-${Date.now()}`,
      amount: 10000,
      customerName: "Test Diagnostic",
      customerWa: "62895429126232",
      itemName: "Test Diagnostic",
    });
    return NextResponse.json({ success: true, tx, env: { CLIENT_ID: !!process.env.DOKU_CLIENT_ID, SECRET_KEY: !!process.env.DOKU_SECRET_KEY, PROD: process.env.DOKU_IS_PRODUCTION } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message, stack: e.stack, env: { CLIENT_ID: !!process.env.DOKU_CLIENT_ID, SECRET_KEY: !!process.env.DOKU_SECRET_KEY, PROD: process.env.DOKU_IS_PRODUCTION } }, { status: 500 });
  }
}

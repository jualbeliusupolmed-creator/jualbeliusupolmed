import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const rawBaileysUrl = process.env.BAILEYS_API_URL || "";
const BAILEYS_URL = rawBaileysUrl.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
const BAILEYS_TOKEN = (process.env.BAILEYS_API_TOKEN || "jualbeliusu_rahasia").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "status";

  if (!BAILEYS_URL) return NextResponse.json({ error: "BAILEYS_API_URL belum diset" }, { status: 503 });

  const cleanUrl = BAILEYS_URL.replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/\/$/, "");

  try {
    // Teruskan query param tambahan (selain endpoint & _t) ke Baileys server
    const forwardUrl = new URL(`${cleanUrl}/${endpoint}`);
    for (const [key, val] of searchParams.entries()) {
      if (key !== "endpoint" && key !== "_t") forwardUrl.searchParams.set(key, val);
    }
    const res = await fetch(forwardUrl.toString(), {
      headers: { Authorization: BAILEYS_TOKEN },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "";
  const body = await req.json().catch(() => ({}));

  if (!BAILEYS_URL) return NextResponse.json({ error: "BAILEYS_API_URL belum diset" }, { status: 503 });
  const cleanUrl = BAILEYS_URL.replace(/[​-‍﻿]/g, "").trim().replace(/\/$/, "");

  try {
    const res = await fetch(`${cleanUrl}/${endpoint}`, {
      method: "DELETE",
      headers: { Authorization: BAILEYS_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "send";
  const body = await req.json().catch(() => ({}));

  if (!BAILEYS_URL) return NextResponse.json({ error: "BAILEYS_API_URL belum diset" }, { status: 503 });

  const cleanUrl = BAILEYS_URL.replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/\/$/, "");

  try {
    const res = await fetch(`${cleanUrl}/${endpoint}`, {
      method: "POST",
      headers: { Authorization: BAILEYS_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

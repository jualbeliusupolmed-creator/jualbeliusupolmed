import { NextResponse } from "next/server";
import { tokenBotUtama } from "@/lib/botTokens";

const getBaileysUrl = () => (process.env.BAILEYS_API_URL || "").replace(/\/$/, "");

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const jid = searchParams.get("jid");

  const baseUrl = getBaileysUrl();
  if (!baseUrl) return NextResponse.json({ error: "BAILEYS_API_URL belum disetting" }, { status: 500 });
  const token = tokenBotUtama();

  try {
    if (action === "groups") {
      const res = await fetch(`${baseUrl}/groups?fresh=1`, {
        headers: { "Authorization": token }
      });
      const data = await res.json();
      return NextResponse.json(data);
    } 
    
    if (action === "members" && jid) {
      const res = await fetch(`${baseUrl}/groups/${encodeURIComponent(jid)}`, {
        headers: { "Authorization": token }
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const baseUrl = getBaileysUrl();
  if (!baseUrl) return NextResponse.json({ error: "BAILEYS_API_URL belum disetting" }, { status: 500 });
  const token = tokenBotUtama();

  try {
    const { target, message, imageUrl } = await request.json();
    
    // We proxy it to the /send endpoint
    const payload = { target, message };
    if (imageUrl) payload.url = imageUrl;

    const res = await fetch(`${baseUrl}/send`, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

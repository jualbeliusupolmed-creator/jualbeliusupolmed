import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(value, maxChars = 34, maxLines = 8) {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  const omitted = words.join(" ").length > lines.join(" ").length;
  if (omitted && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, maxChars - 1)}…`;
  return lines;
}

// Gambar JPEG publik untuk Instagram. Tidak memuat identitas internal pengirim.
export async function GET(_request, { params }) {
  const { data: post, error } = await getAdminClient()
    .from("mading_posts")
    .select("id, type, sender_name, faculty, title, content, status")
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !post) return new NextResponse("Not found", { status: 404 });

  const heading = post.type === "info" ? "INFO KAMPUS" : "MENFESS USU · POLMED";
  const contentLines = wrapText(post.content);
  const titleLines = post.title ? wrapText(post.title, 30, 2) : [];
  const lineStart = 430 - (contentLines.length * 6);

  const svg = `
    <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#24104a"/><stop offset="0.52" stop-color="#5725a7"/><stop offset="1" stop-color="#314bb0"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1080" fill="url(#bg)"/>
      <circle cx="1000" cy="120" r="230" fill="#ffffff" fill-opacity=".07"/>
      <circle cx="90" cy="1010" r="260" fill="#ffffff" fill-opacity=".05"/>
      <rect x="72" y="72" width="936" height="936" rx="52" fill="#ffffff" fill-opacity=".10" stroke="#ffffff" stroke-opacity=".20"/>
      <text x="122" y="155" fill="#c4b5fd" font-family="Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="4">${escapeXml(heading)}</text>
      <line x1="122" y1="190" x2="958" y2="190" stroke="#ffffff" stroke-opacity=".25"/>
      ${titleLines.map((line, index) => `<text x="122" y="${260 + index * 52}" fill="#ffffff" font-family="Arial, sans-serif" font-size="43" font-weight="700">${escapeXml(line)}</text>`).join("")}
      ${contentLines.map((line, index) => `<text x="122" y="${lineStart + index * 58}" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="400">${escapeXml(line)}</text>`).join("")}
      <text x="122" y="900" fill="#ddd6fe" font-family="Arial, sans-serif" font-size="28">${escapeXml(post.sender_name || "Anonim")} · ${escapeXml(post.faculty || "USU / POLMED")}</text>
      <text x="122" y="952" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="700">USUPOLMEDUPDATE</text>
      <text x="958" y="952" text-anchor="end" fill="#c4b5fd" font-family="Arial, sans-serif" font-size="24">jualbeliusupolmed.web.id</text>
    </svg>`;

  const image = await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  return new NextResponse(image, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function rupiah(n) {
  if (!n) return "";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

// Allowlist host gambar OG: cuma Supabase storage & domain sendiri. Tolak IP privat,
// localhost, dan host lain (anti-SSRF).
function isAllowedImageHost(raw) {
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return false;
  if (/^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
  const allowed = [];
  for (const envUrl of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_BASE_URL]) {
    try { if (envUrl) allowed.push(new URL(envUrl).hostname.toLowerCase()); } catch {}
  }
  // Fallback statis kalau env tak tersedia di runtime edge.
  allowed.push("jualbeliusupolmed.web.id", "www.jualbeliusupolmed.web.id");
  return allowed.some((h) => host === h || host.endsWith(".supabase.co") || host.endsWith("." + h));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title    = (searchParams.get("title")    || "Jual Beli USU Polmed").slice(0, 90);
  const price    = searchParams.get("price")    || "";
  const image    = searchParams.get("image")    || "";
  const seller   = (searchParams.get("seller")   || "").slice(0, 40);
  const category = (searchParams.get("category") || "").slice(0, 30);
  const type     = searchParams.get("type")     || "jual"; // jual | jasa | blog

  // Fetch product image as base64 so Satori can render it.
  // Anti-SSRF: hanya izinkan gambar dari host tepercaya (Supabase storage / domain
  // sendiri). Tanpa ini, ?image=http://169.254.169.254/... memaksa server fetch
  // endpoint internal/metadata.
  let imgSrc = null;
  if (image && isAllowedImageHost(image)) {
    try {
      const r = await fetch(image, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const buf = await r.arrayBuffer();
        const mime = r.headers.get("content-type") || "image/jpeg";
        imgSrc = `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
      }
    } catch { /* skip if slow/unavailable */ }
  }

  const accentColor = type === "blog" ? "#7c3aed" : type === "jasa" ? "#0891b2" : "#16a34a";
  const priceText = price ? rupiah(price) : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circle */}
        <div style={{ position: "absolute", top: -120, right: imgSrc ? 300 : -80, width: 500, height: 500, borderRadius: "50%", background: `${accentColor}22`, display: "flex" }} />
        <div style={{ position: "absolute", bottom: -100, left: -80, width: 350, height: 350, borderRadius: "50%", background: `${accentColor}11`, display: "flex" }} />

        {/* Left content */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 60px", justifyContent: "space-between", zIndex: 1 }}>
          {/* Top: site brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: 20, fontWeight: 800 }}>J</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>Jual Beli USU Polmed</span>
          </div>

          {/* Middle: content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Category badge */}
            {category && (
              <div style={{ display: "flex" }}>
                <span style={{ background: `${accentColor}33`, color: accentColor === "#16a34a" ? "#4ade80" : accentColor === "#0891b2" ? "#38bdf8" : "#c4b5fd", border: `1px solid ${accentColor}55`, padding: "5px 14px", borderRadius: 100, fontSize: 16, fontWeight: 600 }}>
                  {category}
                </span>
              </div>
            )}
            {/* Title */}
            <p style={{ margin: 0, fontSize: title.length > 55 ? 38 : title.length > 35 ? 46 : 54, fontWeight: 800, color: "white", lineHeight: 1.15, maxWidth: imgSrc ? 560 : 900 }}>
              {title}
            </p>
            {/* Price */}
            {priceText && (
              <p style={{ margin: 0, fontSize: 42, fontWeight: 800, color: accentColor === "#16a34a" ? "#4ade80" : accentColor === "#0891b2" ? "#38bdf8" : "#c4b5fd" }}>
                {priceText}
              </p>
            )}
            {/* Seller */}
            {seller && (
              <p style={{ margin: 0, fontSize: 20, color: "rgba(255,255,255,0.55)" }}>
                oleh {seller}
              </p>
            )}
          </div>

          {/* Bottom: URL */}
          <p style={{ margin: 0, fontSize: 18, color: "rgba(255,255,255,0.35)", letterSpacing: 0.5 }}>
            jualbeliusupolmed.web.id
          </p>
        </div>

        {/* Right: product image */}
        {imgSrc && (
          <div style={{ display: "flex", width: 340, position: "relative", overflow: "hidden", flexShrink: 0 }}>
            {/* gradient overlay */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #0f172a 0%, transparent 40%)", zIndex: 1, display: "flex" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

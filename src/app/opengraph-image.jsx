import { ImageResponse } from "next/og";

// Edge runtime wajib di sini: bundel Node dari @vercel/og gagal di-prerender
// saat path proyek mengandung spasi (fileURLToPath "Invalid URL").
export const runtime = "edge";
export const alt =
  "Jual Beli USU Polmed — Marketplace Mahasiswa USU & POLMED Medan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #111827 55%, #064e3b 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Aksen lingkaran */}
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: "rgba(16,185,129,0.18)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -100,
            bottom: -140,
            width: 360,
            height: 360,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.05)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "#34d399",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Marketplace Kampus · USU & POLMED
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 84,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          Jual Beli USU Polmed
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 34,
            color: "rgba(255,255,255,0.78)",
            lineHeight: 1.4,
            maxWidth: 900,
          }}
        >
          Laptop, HP, buku kuliah, fashion, makanan, kos, hingga jasa.
        </div>

        <div style={{ display: "flex", marginTop: 48, gap: 16 }}>
          {["Aman & dibantu admin", "COD di kampus", "Gratis pasang dicari"].map(
            (t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "12px 26px",
                  borderRadius: 9999,
                  border: "2px solid rgba(52,211,153,0.45)",
                  color: "#a7f3d0",
                  fontSize: 24,
                  fontWeight: 600,
                  background: "rgba(6,78,59,0.35)",
                }}
              >
                {t}
              </div>
            )
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 44,
            right: 80,
            display: "flex",
            color: "rgba(255,255,255,0.55)",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          jualbeliusupolmed.web.id
        </div>
      </div>
    ),
    { ...size }
  );
}

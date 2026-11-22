import { motion } from "motion/react";
import { AbsoluteFill } from "remotion";

export const PostingScene: React.FC = () => {
  const steps = [
    {
      num: 1,
      color: "blue",
      title: "Client Input & Validasi",
      files: "src/app/jual/JualClient.jsx, src/lib/constants.js",
      details: [
        "Form multi-step: judul, deskripsi, harga, stok, kategori, spesifikasi dinamis",
        "Validasi real-time: Zod schema (src/lib/listingSchema.js)",
        "Upload gambar: drag-drop, kompresi client-side (Sharp WASM), max 10 file",
        "Format WA otomatis: parseWaInput() → \"0812-3456-7890\"",
        "Honeypot field tersembunyi anti-bot",
      ]
    },
    {
      num: 2,
      color: "indigo",
      title: "API Gateway & Autentikasi",
      files: "src/app/api/listings/route.js, src/lib/auth.js, src/lib/rateLimit.js",
      details: [
        "POST /api/listings — menerima payload JSON + file",
        "Rate limiting: rateLimitDistributed() — 10 req / 10 menit per IP",
        "HMAC session verify: getSellerSessionAsync() → cookie seller_session",
        "Honeypot check: field website/honeypot → reject 400",
        "Zod validation: listingInputSchema.safeParse(body)",
      ]
    },
    {
      num: 3,
      color: "purple",
      title: "Moderasi AI (Dual Layer)",
      files: "src/lib/moderationRules.js",
      details: [
        "Lapisan 1: Deterministik (instant, gratis) — keyword terlarang, price limits, duplikasi",
        "Lapisan 2: Gemini 2.5 Flash (6s timeout + fallback) — 8 kategori terlarang + skor risiko 0.0-1.0",
        "Output: is_prohibited, scam_risk_score, reason",
        "Fallback ke 'pending' jika AI timeout/error",
      ]
    },
    {
      num: 4,
      color: "green",
      title: "Persistensi Database & Logika Bisnis",
      files: "src/app/api/listings/route.js, src/lib/fees.js, src/lib/distributor.js",
      details: [
        "Service Role insert (bypass RLS), auto-heal profil kampus",
        "adFeeFrom() hitung biaya: listing, bump, featured, auto-bump, renew",
        "Gratis: freeMode, Pro user, Distributor, Punya Toko",
        "Distributor: fee bagi hasil calcDistributorFee() (tiered rules)",
        "Auto-heal profil kampus jika kosong",
      ]
    },
    {
      num: 5,
      color: "amber",
      title: "Distribusi Otomatis (Async & Non-blocking)",
      files: "src/app/api/listings/route.js",
      details: [
        "void (async () => { ... })() — non-blocking",
        "postToGroup() via Fonnte API → WhatsApp grup",
        "autoPublishListingInstagram() → Katalog & Menfess",
        "pushListingBaru() Web Push API → subscriber",
        "notifyCategorySubscribers() & notifyKeywordSubscribers()",
      ]
    },
  ];

  return (
    <AbsoluteFill style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4c1d95 100%)",
      padding: "4rem",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ textAlign: "center", maxWidth: "1000px" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ marginBottom: "2rem" }}
        >
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(34, 197, 94, 0.15)",
            color: "#22c55e",
            padding: "0.5rem 1.5rem",
            borderRadius: "9999px",
            fontWeight: 600,
            fontSize: "0.875rem",
            border: "1px solid rgba(34, 197, 94, 0.3)"
          }}>
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
              animation: "pulse 2s infinite"
            }} />
            FLOW PASANG IKLAN
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            fontSize: "3.5rem",
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#f8fafc",
            fontFamily: "'Space Grotesk', sans-serif",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #22c55e)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            backgroundSize: "200% auto",
          }}
        >
          Flow <span style={{ color: "#22c55e" }}>Pasang Iklan</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            fontSize: "1.25rem",
            color: "#94a3b8",
            maxWidth: "700px",
            margin: "1.5rem auto 3rem",
            lineHeight: 1.6,
            fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          End-to-end: Form → API → Moderasi AI → Database → Distribusi Async (WA, IG, Push, Subscriber)
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{ maxWidth: "900px", width: "100%" }}
        >
          {steps.map((step, idx) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + idx * 0.15 }}
              style={{
                display: "flex",
                gap: "1rem",
                padding: "1.5rem",
                marginBottom: "1rem",
                borderRadius: "1rem",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                background: "rgba(15, 23, 42, 0.6)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: step.color === "blue" ? "#3b82f6" : step.color === "indigo" ? "#6366f1" : step.color === "purple" ? "#8b5cf6" : step.color === "green" ? "#22c55e" : "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {step.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" }}>
                  <h3 style={{
                    margin: 0,
                    color: step.color === "blue" ? "#60a5fa" : step.color === "indigo" ? "#a5b4fc" : step.color === "purple" ? "#c4b5fd" : step.color === "green" ? "#86efac" : "#fcd34d",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                  }}>
                    {step.title}
                  </h3>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    background: "rgba(15, 23, 42, 0.8)",
                    color: "#94a3b8",
                    padding: "0.125rem 0.5rem",
                    borderRadius: "9999px",
                    border: "1px solid rgba(148, 163, 184, 0.15)",
                    marginTop: "0.25rem",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {step.files}
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.8, fontFamily: "'JetBrains Mono', monospace" }}>
                  {step.details.map((detail, dIdx) => (
                    <li key={dIdx} style={{ marginBottom: "0.5rem" }}>{detail}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          style={{
            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "1rem",
            padding: "2rem",
            marginTop: "2rem",
            maxWidth: "900px"
          }}
        >
          <h3 style={{
            margin: "0 0 1.5rem",
            color: "#f8fafc",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.5rem",
            fontWeight: 700,
            textAlign: "center",
          }}>
            Ringkasan Alur Data
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
            textAlign: "center",
          }}>
            {[
              { num: 1, color: "blue", label: "Client", desc: "Form + Validasi + Kompresi" },
              { num: 2, color: "indigo", label: "API", desc: "Rate Limit + Auth + Sanitasi" },
              { num: 3, color: "purple", label: "AI", desc: "Deterministik + Gemini" },
              { num: 4, color: "green", label: "DB", desc: "Insert + Logika Bisnis" },
              { num: 5, color: "amber", label: "Distribusi", desc: "WA + IG + Push + Subscriber" },
            ].map((item) => (
              <div key={item.num} style={{ padding: "1rem" }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "1rem",
                  background: item.color === "blue" ? "linear-gradient(135deg, #3b82f6, #60a5fa)" : item.color === "indigo" ? "linear-gradient(135deg, #6366f1, #a5b4fc)" : item.color === "purple" ? "linear-gradient(135deg, #8b5cf6, #c4b5fd)" : item.color === "green" ? "linear-gradient(135deg, #22c55e, #86efac)" : "linear-gradient(135deg, #f59e0b, #fcd34d)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.75rem",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "white",
                }}>
                  {item.num}
                </div>
                <h4 style={{ margin: "0 0 0.25rem", color: "#f8fafc", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  {item.label}
                </h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.4 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AbsoluteFill>
  );
};
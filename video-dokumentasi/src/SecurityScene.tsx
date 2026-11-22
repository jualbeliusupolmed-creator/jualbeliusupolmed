import { motion } from "motion/react";
import { AbsoluteFill } from "remotion";

export const SecurityScene: React.FC = () => {
  const layers = [
    {
      num: 1,
      color: "emerald",
      title: "Transport & Edge",
      details: [
        "HTTPS enforced (Vercel Edge + HSTS)",
        "CSP: script-src 'self' 'unsafe-inline' https://vercel.live",
        "Security Headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff",
        "Referrer-Policy: strict-origin-when-cross-origin",
        "Rate limiting di Edge: 100 req/10s per IP",
      ]
    },
    {
      num: 2,
      color: "blue",
      title: "Autentikasi & Sesi",
      details: [
        "Supabase Auth: JWT (RS256) + HttpOnly Secure cookie",
        "Seller session: HMAC-SHA256 signed cookie (seller_session)",
        "Session expiry: 30 hari, rotating secret via env",
        "PKCE flow untuk OAuth (Google, GitHub)",
        "MFA/TOTP optional untuk admin",
      ]
    },
    {
      num: 3,
      color: "purple",
      title: "API & Validasi Input",
      details: [
        "Zod schema di semua endpoint (listingSchema, paymentSchema, dll)",
        "Honeypot field tersembunyi di form publik",
        "Sanitasi HTML: DOMPurify sebelum render user content",
        "File upload: tipe MIME + ekstensi + magic bytes check",
        "Sharp WASM kompresi client-side → hindari upload berbahaya",
      ]
    },
    {
      num: 4,
      color: "amber",
      title: "Row Level Security (Supabase)",
      details: [
        "Semua tabel public: ENABLE ROW LEVEL SECURITY",
        "listings: SELECT public, INSERT own (seller_id = auth.uid())",
        "payments: INSERT own, UPDATE own (status pending→paid)",
        "seller_profiles: SELECT/UPDATE own campus + phone",
        "admin_audit_events: SELECT admin only, INSERT service_role",
        "wa_outbox: INSERT service_role (bot), SELECT admin",
      ]
    },
    {
      num: 5,
      color: "red",
      title: "Bot WhatsApp & Infrastruktur",
      details: [
        "VPS isolasi: non-root user, SSH key only, UFW allow 22/80/443",
        "Baileys auth_state: ./auth_info/ (chmod 700, gitignored)",
        "PM2: auto-restart, max memory restart 500MB, log rotation",
        "Nginx: rate limit 10 req/s, SSL TLS 1.3, proxy_hide_header",
        "Fonnte API key: env var only, rotasi berkala",
        "Supabase service_role: hanya di VPS bot, tidak di client",
      ]
    },
    {
      num: 6,
      color: "indigo",
      title: "Observability & Incident Response",
      details: [
        "Vercel Analytics + Speed Insights (anonim, no PII)",
        "Supabase Logs: Audit trail 30 hari, PII redaction",
        "Bot health-check: heartbeat 60s ke bot_status table",
        "Alert: bot down > 5 menit → notifikasi admin WA",
        "Rollback: Vercel instant rollback, VPS git revert + pm2 reload",
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
            KEAMANAN & RLS
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
            background: "linear-gradient(135deg, #ef4444, #f59e0b, #22c55e, #3b82f6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            backgroundSize: "200% auto",
          }}
        >
          Defense in <span style={{ color: "#22c55e" }}>Depth</span>
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
          6 lapis pertahanan: Edge → Auth → API → Database (RLS) → Infra Bot → Observability
        </motion.p>

        {/* Shield Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{
            width: "100%",
            maxWidth: "900px",
            aspectRatio: "16/10",
            borderRadius: "1rem",
            overflow: "hidden",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            background: "rgba(15, 23, 42, 0.8)",
            position: "relative",
          }}
        >
          <svg viewBox="0 0 900 500" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1"/>
                <stop offset="16%" stopColor="#f59e0b" stopOpacity="0.1"/>
                <stop offset="33%" stopColor="#22c55e" stopOpacity="0.1"/>
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1"/>
                <stop offset="66%" stopColor="#8b5cf6" stopOpacity="0.1"/>
                <stop offset="83%" stopColor="#ec4899" stopOpacity="0.1"/>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1"/>
              </linearGradient>
              <filter id="shieldGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="12" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Central Shield */}
            <path
              d="M 450 50 L 450 50 Q 550 50 550 120 Q 550 220 450 400 Q 350 220 350 120 Q 350 50 450 50 Z"
              fill="url(#shieldGrad)"
              stroke="#22c55e"
              strokeWidth="3"
              strokeOpacity="0.4"
              filter="url(#shieldGlow)"
            />

            {/* Layer 1 - Edge */}
            <g transform="translate(450, 80)">
              <circle r="140" fill="#ef4444" fillOpacity="0.08" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,5"/>
              <text x="0" y="-110" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#ef4444" textAnchor="middle">1. EDGE</text>
              <text x="0" y="-90" fontFamily="Space Grotesk" fontSize="11" fill="#94a3b8" textAnchor="middle">HTTPS + CSP + Rate Limit</text>
            </g>

            {/* Layer 2 - Auth */}
            <g transform="translate(450, 140)">
              <circle r="110" fill="#f59e0b" fillOpacity="0.08" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,5"/>
              <text x="0" y="-75" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#f59e0b" textAnchor="middle">2. AUTH</text>
              <text x="0" y="-55" fontFamily="Space Grotesk" fontSize="11" fill="#94a3b8" textAnchor="middle">JWT + HMAC Session + MFA</text>
            </g>

            {/* Layer 3 - API */}
            <g transform="translate(450, 190)">
              <circle r="80" fill="#22c55e" fillOpacity="0.08" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5,5"/>
              <text x="0" y="-40" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#22c55e" textAnchor="middle">3. API</text>
              <text x="0" y="-20" fontFamily="Space Grotesk" fontSize="11" fill="#94a3b8" textAnchor="middle">Zod + Honeypot + Sanitasi</text>
            </g>

            {/* Layer 4 - RLS */}
            <g transform="translate(450, 230)">
              <circle r="50" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2"/>
              <text x="0" y="-5" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#3b82f6" textAnchor="middle">4. RLS</text>
              <text x="0" y="15" fontFamily="Space Grotesk" fontSize="11" fill="#94a3b8" textAnchor="middle">Owner-only policies</text>
            </g>

            {/* Side annotations */}
            <g className="side-labels" transform="translate(700, 100)">
              {layers.map((layer, idx) => {
                const colorMap: Record<string, string> = {
                  emerald: "#22c55e",
                  blue: "#3b82f6",
                  purple: "#8b5cf6",
                  amber: "#f59e0b",
                  red: "#ef4444",
                  indigo: "#6366f1",
                };
                return (
                  <g key={layer.num} transform={`translate(0, ${idx * 60})`}>
                    <circle cx="20" cy="0" r="10" fill={colorMap[layer.color]} opacity="0.8"/>
                    <text x="40" y="5" fontFamily="Space Grotesk" fontSize="13" fontWeight="600" fill="#f8fafc" dominantBaseline="middle">
                      {layer.num}. {layer.title}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Bot Infra annotation */}
            <g transform="translate(150, 380)">
              <rect x="-100" y="-20" width="200" height="80" rx="12" fill="#16a34a" fillOpacity="0.1" stroke="#16a34a" strokeWidth="1.5"/>
              <text x="0" y="5" fontFamily="Space Grotesk" fontSize="13" fontWeight="700" fill="#16a34a" textAnchor="middle">5. BOT INFRA</text>
              <text x="0" y="25" fontFamily="Space Grotesk" fontSize="11" fill="#94a3b8" textAnchor="middle">VPS isolate • PM2 • Nginx</text>
              <text x="0" y="42" fontFamily="Space Grotesk" fontSize="11" fill="#94a3b8" textAnchor="middle">Service role only here</text>
            </g>

            {/* Observability annotation */}
            <g transform="translate(750, 380)">
              <rect x="-100" y="-20" width="200" height="80" rx="12" fill="#8b5cf6" fillOpacity="0.1" stroke="#8b5cf6" strokeWidth="1.5"/>
              <text x="0" y="5" fontFamily="Space Grotesk" fontSize="13" fontWeight="700" fill="#8b5cf6" textAnchor="middle">6. OBSERVABILITY</text>
              <text x="0" y="25" fontFamily="Space Grotesk" fontSize="11" fill="#94a3b8" textAnchor="middle">Vercel Analytics</text>
              <text x="0" y="42" fontFamily="Space Grotesk" fontSize="11" fill="#94a3b8" textAnchor="middle">Supabase Audit Logs</text>
            </g>
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem", marginTop: "2rem" }}
        >
          <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(239, 68, 68, 0.3)" }}>HTTPS/CSP</span>
          <span style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(245, 158, 11, 0.3)" }}>JWT/HMAC</span>
          <span style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(34, 197, 94, 0.3)" }}>Zod/Validate</span>
          <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(59, 130, 246, 0.3)" }}>RLS Policies</span>
          <span style={{ background: "rgba(22, 163, 74, 0.1)", color: "#16a34a", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(22, 163, 74, 0.3)" }}>VPS Isolate</span>
          <span style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(139, 92, 246, 0.3)" }}>Audit Logs</span>
        </motion.div>
      </motion.div>
    </AbsoluteFill>
  );
};
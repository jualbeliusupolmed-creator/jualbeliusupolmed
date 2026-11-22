import { motion } from "motion/react";
import { AbsoluteFill } from "remotion";

export const BotScene: React.FC = () => {
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
        style={{ textAlign: "center", maxWidth: "900px" }}
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
            BOT WHATSAPP
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
            background: "linear-gradient(135deg, #16a34a, #22c55e, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            backgroundSize: "200% auto",
          }}
        >
          Bot <span style={{ color: "#22c55e" }}>WhatsApp</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            fontSize: "1.25rem",
            color: "#94a3b8",
            maxWidth: "600px",
            margin: "1.5rem auto 3rem",
            lineHeight: 1.6,
            fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          Baileys multi-device di VPS terpisah, sinkronisasi real-time via Supabase
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{
            width: "100%",
            maxWidth: "800px",
            aspectRatio: "4/3",
            borderRadius: "1rem",
            overflow: "hidden",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            background: "rgba(15, 23, 42, 0.8)",
            position: "relative",
          }}
        >
          <svg viewBox="0 0 800 850" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="vpsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.15"/>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15"/>
              </linearGradient>
              <linearGradient id="supaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/>
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.15"/>
              </linearGradient>
              <linearGradient id="vercelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.15"/>
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.15"/>
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
              </marker>
            </defs>

            {/* VPS Box */}
            <rect x="50" y="50" width="320" height="480" rx="20" fill="url(#vpsGrad)" stroke="#16a34a" strokeWidth="2" strokeOpacity="0.3" filter="url(#glow)"/>
            <text x="210" y="90" fontFamily="Space Grotesk" fontSize="20" fontWeight="700" fill="#f8fafc" textAnchor="middle">🖥️ VPS (Ubuntu 22.04+) PM2 + Nginx</text>

            {/* Bot Process */}
            <rect x="70" y="130" width="280" height="340" rx="16" fill="#16a34a" fillOpacity="0.1" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="5,5"/>
            <text x="210" y="160" fontFamily="Space Grotesk" fontSize="16" fontWeight="600" fill="#16a34a" textAnchor="middle">Baileys WhatsApp Bot</text>
            <text x="210" y="185" fontFamily="JetBrains Mono" fontSize="12" fill="#94a3b8" textAnchor="middle">Multi-device Session</text>
            <text x="210" y="205" fontFamily="JetBrains Mono" fontSize="12" fill="#94a3b8" textAnchor="middle">Auth State: ./auth_info/</text>
            <text x="210" y="225" fontFamily="JetBrains Mono" fontSize="12" fill="#94a3b8" textAnchor="middle">index.js (main handler)</text>

            {/* Components */}
            <g className="bot-components">
              <rect x="90" y="250" width="120" height="70" rx="8" fill="#16a34a" fillOpacity="0.15" stroke="#16a34a" strokeWidth="1"/>
              <text x="150" y="278" fontFamily="Space Grotesk" fontSize="12" fontWeight="600" fill="#16a34a" textAnchor="middle">Core</text>
              <text x="150" y="296" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">message.upsert</text>
              <text x="150" y="310" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">connection.update</text>

              <rect x="230" y="250" width="120" height="70" rx="8" fill="#16a34a" fillOpacity="0.15" stroke="#16a34a" strokeWidth="1"/>
              <text x="290" y="278" fontFamily="Space Grotesk" fontSize="12" fontWeight="600" fill="#16a34a" textAnchor="middle">Session</text>
              <text x="290" y="296" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">Multi-device</text>
              <text x="290" y="310" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">QR Pairing</text>

              <rect x="90" y="340" width="120" height="70" rx="8" fill="#16a34a" fillOpacity="0.15" stroke="#16a34a" strokeWidth="1"/>
              <text x="150" y="368" fontFamily="Space Grotesk" fontSize="12" fontWeight="600" fill="#16a34a" textAnchor="middle">Commands</text>
              <text x="150" y="386" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">!stats !broadcast</text>
              <text x="150" y="400" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">!ban !unban</text>

              <rect x="230" y="340" width="120" height="70" rx="8" fill="#16a34a" fillOpacity="0.15" stroke="#16a34a" strokeWidth="1"/>
              <text x="290" y="368" fontFamily="Space Grotesk" fontSize="12" fontWeight="600" fill="#16a34a" textAnchor="middle">Broadcast</text>
              <text x="290" y="386" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">Poll wa_outbox (5s)</text>
              <text x="290" y="400" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">Priority queue</text>

              <rect x="90" y="430" width="120" height="70" rx="8" fill="#16a34a" fillOpacity="0.15" stroke="#16a34a" strokeWidth="1"/>
              <text x="150" y="458" fontFamily="Space Grotesk" fontSize="12" fontWeight="600" fill="#16a34a" textAnchor="middle">Realtime</text>
              <text x="150" y="476" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">payments INSERT</text>
              <text x="150" y="490" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">listings UPDATE</text>

              <rect x="230" y="430" width="120" height="70" rx="8" fill="#16a34a" fillOpacity="0.15" stroke="#16a34a" strokeWidth="1"/>
              <text x="290" y="458" fontFamily="Space Grotesk" fontSize="12" fontWeight="600" fill="#16a34a" textAnchor="middle">Health</text>
              <text x="290" y="476" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">Heartbeat 60s</text>
              <text x="290" y="490" fontFamily="JetBrains Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">Memory check</text>
            </g>

            {/* Nginx */}
            <rect x="70" y="520" width="280" height="50" rx="10" fill="#06b6d4" fillOpacity="0.1" stroke="#06b6d4" strokeWidth="1.5"/>
            <text x="210" y="547" fontFamily="Space Grotesk" fontSize="13" fontWeight="600" fill="#06b6d4" textAnchor="middle">Nginx Reverse Proxy (SSL + Rate Limit)</text>

            {/* PM2 */}
            <rect x="70" y="580" width="280" height="40" rx="10" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeWidth="1.5"/>
            <text x="210" y="602" fontFamily="Space Grotesk" fontSize="13" fontWeight="600" fill="#f59e0b" textAnchor="middle">PM2 Process Manager (Auto-restart • Logs)</text>

            {/* Auth Info */}
            <rect x="70" y="640" width="280" height="30" rx="6" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,4"/>
            <text x="210" y="660" fontFamily="JetBrains Mono" fontSize="10" fill="#f59e0b" textAnchor="middle">📁 ./auth_info/ (creds.json, pre-keys, signedPreKey)</text>

            {/* Scripts */}
            <rect x="70" y="680" width="280" height="30" rx="6" fill="#06b6d4" fillOpacity="0.1" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4,4"/>
            <text x="210" y="700" fontFamily="JetBrains Mono" fontSize="10" fill="#06b6d4" textAnchor="middle">📁 scripts/ (cadangkan-sesi.sh, health-check.sh)</text>

            {/* Config */}
            <rect x="70" y="720" width="280" height="30" rx="6" fill="#8b5cf6" fillOpacity="0.1" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4,4"/>
            <text x="210" y="740" fontFamily="JetBrains Mono" fontSize="10" fill="#8b5cf6" textAnchor="middle">📁 config/ (groups.json, commands.json, settings.json)</text>

            {/* Arrow VPS -> Supabase */}
            <path d="M 370 300 Q 440 300 460 280" stroke="#22c55e" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="10,5" opacity="0.6"/>
            <text x="415" y="260" fontFamily="Space Grotesk" fontSize="12" fill="#22c55e" textAnchor="middle">Supabase Client (JS)</text>

            {/* Supabase Box */}
            <rect x="480" y="80" width="280" height="300" rx="20" fill="url(#supaGrad)" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.3" filter="url(#glow)"/>
            <text x="620" y="120" fontFamily="Space Grotesk" fontSize="18" fontWeight="700" fill="#f8fafc" textAnchor="middle">☁️ Supabase Cloud</text>

            <rect x="500" y="150" width="240" height="210" rx="12" fill="#3b82f6" fillOpacity="0.08" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4"/>
            <text x="620" y="180" fontFamily="Space Grotesk" fontSize="14" fontWeight="600" fill="#3b82f6" textAnchor="middle">PostgreSQL Database</text>
            <text x="620" y="205" fontFamily="JetBrains Mono" fontSize="10" fill="#94a3b8" textAnchor="middle">• listings (status, campus)</text>
            <text x="620" y="225" fontFamily="JetBrains Mono" fontSize="10" fill="#94a3b8" textAnchor="middle">• payments (QRIS, sold_fee)</text>
            <text x="620" y="245" fontFamily="JetBrains Mono" fontSize="10" fill="#94a3b8" textAnchor="middle">• seller_profiles (WA, campus)</text>
            <text x="620" y="265" fontFamily="JetBrains Mono" fontSize="10" fill="#94a3b8" textAnchor="middle">• wa_outbox (broadcast queue)</text>
            <text x="620" y="285" fontFamily="JetBrains Mono" fontSize="10" fill="#94a3b8" textAnchor="middle">• admin_audit_events</text>
            <text x="620" y="305" fontFamily="JetBrains Mono" fontSize="10" fill="#94a3b8" textAnchor="middle">• bot_status (heartbeat)</text>

            {/* Arrow Supabase -> Vercel */}
            <path d="M 620 80 Q 620 30 640 10" stroke="#8b5cf6" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="10,5" opacity="0.6"/>
            <text x="660" y="35" fontFamily="Space Grotesk" fontSize="12" fill="#8b5cf6" textAnchor="middle">REST/Realtime</text>

            {/* Vercel Box */}
            <rect x="660" y="10" width="150" height="60" rx="15" fill="url(#vercelGrad)" stroke="#000" strokeWidth="2" strokeOpacity="0.3" fillOpacity="0.2"/>
            <text x="735" y="38" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#f8fafc" textAnchor="middle">Vercel (Next.js)</text>
            <text x="735" y="56" fontFamily="JetBrains Mono" fontSize="10" fill="#94a3b8" textAnchor="middle">API Routes • Web</text>

            {/* WhatsApp Server */}
            <rect x="50" y="780" width="320" height="30" rx="8" fill="#25D366" fillOpacity="0.1" stroke="#25D366" strokeWidth="2" strokeDasharray="8,4"/>
            <text x="210" y="800" fontFamily="Space Grotesk" fontSize="13" fontWeight="600" fill="#25D366" textAnchor="middle">WhatsApp Servers (Multi-device API)</text>

            <line x1="210" y1="770" x2="210" y2="780" stroke="#25D366" strokeWidth="2" strokeDasharray="5,5" opacity="0.5"/>

            {/* Arrow markers */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
              </marker>
            </defs>
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem", marginTop: "2rem" }}
        >
          <span style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(34, 197, 94, 0.3)" }}>Baileys</span>
          <span style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(245, 158, 11, 0.3)" }}>PM2</span>
          <span style={{ background: "rgba(6, 182, 212, 0.1)", color: "#06b6d4", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(6, 182, 212, 0.3)" }}>Nginx</span>
          <span style={{ background: "rgba(255, 107, 107, 0.1)", color: "#ef4444", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(255, 107, 107, 0.3)" }}>Fonnte</span>
          <span style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(139, 92, 246, 0.3)" }}>Supabase</span>
        </motion.div>
      </motion.div>
    </AbsoluteFill>
  );
};
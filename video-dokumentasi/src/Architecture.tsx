import { motion } from "motion/react";
import { AbsoluteFill } from "remotion";

export const Architecture: React.FC = () => {
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
        style={{ textAlign: "center", maxWidth: "800px" }}
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
            ARSITEKTUR SISTEM
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
            background: "linear-gradient(135deg, #22c55e, #22c55e, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            backgroundSize: "200% auto",
          }}
        >
          Arsitektur <span style={{ color: "#22c55e" }}>High-Level</span>
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
          Client → Edge → App → Data → AI → Messaging → Social → Observability
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{
            width: "100%",
            maxWidth: "700px",
            aspectRatio: "16/10",
            borderRadius: "1rem",
            overflow: "hidden",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            background: "rgba(15, 23, 42, 0.8)",
            position: "relative",
          }}
        >
          <svg viewBox="0 0 800 400" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
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

            {/* Client Layer */}
            <g className="client">
              <rect x="50" y="40" width="200" height="100" rx="12" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" strokeOpacity="0.3"/>
              <text x="150" y="75" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#1e3a5f" textAnchor="middle">🌐 Client Layer</text>
              <text x="150" y="95" fontFamily="Space Grotesk" fontSize="11" fill="#1e3a5f" textAnchor="middle">Browser / PWA</text>
              <text x="150" y="115" fontFamily="Space Grotesk" fontSize="11" fill="#1e3a5f" textAnchor="middle">Next.js 14</text>
            </g>

            {/* Edge Layer */}
            <g className="edge">
              <rect x="50" y="160" width="200" height="100" rx="12" fill="#fef3c7" stroke="#d97706" strokeWidth="2" strokeOpacity="0.3"/>
              <text x="150" y="195" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#92400e" textAnchor="middle">⚡ Edge (Vercel)</text>
              <text x="150" y="215" fontFamily="Space Grotesk" fontSize="11" fill="#92400e" textAnchor="middle">Middleware + Edge Fn</text>
            </g>

            {/* App Layer */}
            <g className="app">
              <rect x="50" y="280" width="200" height="100" rx="12" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" strokeOpacity="0.3"/>
              <text x="150" y="315" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#14532d" textAnchor="middle">🏗️ App Layer</text>
              <text x="150" y="335" fontFamily="Space Grotesk" fontSize="11" fill="#14532d" textAnchor="middle">API Routes</text>
              <text x="150" y="355" fontFamily="Space Grotesk" fontSize="11" fill="#14532d" textAnchor="middle">Server Actions</text>
            </g>

            {/* Data Layer */}
            <g className="data">
              <rect x="300" y="40" width="220" height="220" rx="16" fill="#faf5ff" stroke="#9333ea" strokeWidth="2" strokeOpacity="0.3" filter="url(#glow)"/>
              <text x="410" y="75" fontFamily="Space Grotesk" fontSize="16" fontWeight="700" fill="#581c87" textAnchor="middle">🗄️ Data Layer (Supabase)</text>
              <rect x="320" y="110" width="180" height="130" rx="10" fill="#f3e8ff" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.3"/>
              <text x="410" y="135" fontFamily="Space Grotesk" fontSize="12" fontWeight="600" fill="#7c2d92" textAnchor="middle">PostgreSQL</text>
              <text x="410" y="155" fontFamily="Space Grotesk" fontSize="10" fill="#7c2d92" textAnchor="middle">• listings, payments</text>
              <text x="410" y="170" fontFamily="Space Grotesk" fontSize="10" fill="#7c2d92" textAnchor="middle">• profiles, audit</text>
              <text x="410" y="200" fontFamily="Space Grotesk" fontSize="10" fill="#7c2d92" textAnchor="middle">Auth • Storage</text>
              <text x="410" y="220" fontFamily="Space Grotesk" fontSize="10" fill="#7c2d92" textAnchor="middle">Realtime</text>
            </g>

            {/* AI Layer */}
            <g className="ai">
              <rect x="550" y="40" width="220" height="100" rx="12" fill="#fce7f3" stroke="#ec4899" strokeWidth="2" strokeOpacity="0.3"/>
              <text x="660" y="75" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#831843" textAnchor="middle">🤖 Intelligence</text>
              <text x="660" y="95" fontFamily="Space Grotesk" fontSize="11" fill="#831843" textAnchor="middle">Gemini 2.5 Flash</text>
              <text x="660" y="115" fontFamily="Space Grotesk" fontSize="11" fill="#831843" textAnchor="middle">Deterministic + AI</text>
            </g>

            {/* Messaging */}
            <g className="msg">
              <rect x="550" y="160" width="220" height="100" rx="12" fill="#ecfeff" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.3"/>
              <text x="660" y="195" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#164e63" textAnchor="middle">💬 Messaging</text>
              <text x="660" y="215" fontFamily="Space Grotesk" fontSize="11" fill="#164e63" textAnchor="middle">Baileys (VPS)</text>
              <text x="660" y="235" fontFamily="Space Grotesk" fontSize="11" fill="#164e63" textAnchor="middle">Fonnte • Push</text>
            </g>

            {/* Social */}
            <g className="social">
              <rect x="550" y="280" width="220" height="100" rx="12" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="2" strokeOpacity="0.3"/>
              <text x="660" y="315" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#9f1239" textAnchor="middle">📱 Social</text>
              <text x="660" y="335" fontFamily="Space Grotesk" fontSize="11" fill="#9f1239" textAnchor="middle">Instagram Graph API</text>
              <text x="660" y="355" fontFamily="Space Grotesk" fontSize="11" fill="#9f1239" textAnchor="middle">Katalog • Menfess</text>
            </g>

            {/* Observability */}
            <g className="obs">
              <rect x="550" y="400" width="220" height="80" rx="12" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" strokeOpacity="0.3"/>
              <text x="660" y="425" fontFamily="Space Grotesk" fontSize="13" fontWeight="700" fill="#334155" textAnchor="middle">📊 Observability</text>
              <text x="660" y="445" fontFamily="Space Grotesk" fontSize="10" fill="#334155" textAnchor="middle">Vercel Analytics • Supabase Logs</text>
            </g>

            {/* Arrows */}
            <path d="M 250 90 H 295" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M 250 210 H 295" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M 250 330 H 295" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M 250 150 Q 275 125 300 110" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M 250 270 Q 275 300 300 280" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M 250 390 Q 300 400 320 390" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M 520 90 H 545" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M 520 210 H 545" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M 520 330 H 545" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="5,5" opacity="0.6"/>
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem", marginTop: "2rem" }}
        >
          <span style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(34, 197, 94, 0.3)" }}>Next.js 14</span>
          <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(59, 130, 246, 0.3)" }}>Supabase</span>
          <span style={{ background: "rgba(236, 72, 153, 0.1)", color: "#ec4899", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(236, 72, 153, 0.3)" }}>Gemini AI</span>
          <span style={{ background: "rgba(6, 182, 212, 0.1)", color: "#06b6d4", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(6, 182, 212, 0.3)" }}>Baileys</span>
          <span style={{ background: "rgba(244, 63, 94, 0.1)", color: "#f43f5e", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(244, 63, 94, 0.3)" }}>Instagram</span>
        </motion.div>
      </motion.div>
    </AbsoluteFill>
  );
};
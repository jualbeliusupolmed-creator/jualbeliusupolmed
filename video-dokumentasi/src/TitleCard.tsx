import { motion } from "motion/react";
import { useVideoConfig, useCurrentFrame, AbsoluteFill } from "remotion";

export const TitleCard: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const opacity = frame < 20 ? frame / 20 : frame > 70 ? (90 - frame) / 20 : 1;

  return (
    <AbsoluteFill style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4c1d95 100%)",
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ textAlign: "center" }}
      >
        <motion.svg
          width={120}
          height={120}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
          initial={{ opacity: 0, rotate: -180 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </motion.svg>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            color: "#f8fafc",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "4.5rem",
            fontWeight: 700,
            lineHeight: 1.1,
            marginTop: "2rem",
            marginBottom: "1rem",
            letterSpacing: "-0.02em",
          }}
        >
          KampusKita<span style={{ color: "#22c55e" }}>.arch</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{
            color: "#94a3b8",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.5rem",
            maxWidth: "800px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Dokumentasi Arsitektur Sistem — Marketplace Mahasiswa Indonesia
        </motion.p>
      </motion.div>
    </AbsoluteFill>
  );
};
import { motion } from "motion/react";
import { AbsoluteFill } from "remotion";

export const CampusScene: React.FC = () => {
  const campuses = [
    { code: "USU", name: "Universitas Sumatera Utara", color: "#ef4444", students: "35,000+", location: "Medan" },
    { code: "POLMED", name: "Politeknik Negeri Medan", color: "#3b82f6", students: "15,000+", location: "Medan" },
    { code: "USU-POLMED", name: "Ekstensif USU/POLMED", color: "#22c55e", students: "50,000+", location: "Sumatera Utara" },
  ];

  const features = [
    { icon: "🏪", title: "Marketplace Terpadu", desc: "Satu platform untuk kedua kampus, pencarian cross-campus" },
    { icon: "📍", title: "Filter Kampus Otomatis", desc: "Profil seller → campus → filter listing otomatis" },
    { icon: "💬", title: "Komunitas per Kampus", desc: "Grup WA terpisah: USU Jual Beli, POLMED Market" },
    { icon: "🎯", title: "Distribusi Target", desc: "Broadcast & Push notification per kampus" },
    { icon: "🏷️", title: "Kategori Khusus", desc: "Kost USU, Lab POLMED, Buku kuliah, Jasa mahasiswa" },
    { icon: "📊", title: "Analitik per Kampus", desc: "Dashboard admin: GMV, listing aktif, user per kampus" },
  ];

  const flow = [
    { step: 1, label: "Registrasi", detail: "Pilih kampus saat signup (USU/POLMED)" },
    { step: 2, label: "Profil Seller", detail: "Verifikasi WA + kampus → seller_profiles.campus" },
    { step: 3, label: "Pasang Iklan", detail: "Campus auto-set dari profil, validasi cross-campus" },
    { step: 4, label: "Tampilkan", detail: "Filter default: kampus sendiri, toggle 'Semua Kampus'" },
    { step: 5, label: "Transaksi", detail: "Chat WA langsung, rating per kampus" },
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
            MULTI-KAMPUS
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
            background: "linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            backgroundSize: "200% auto",
          }}
        >
          Satu Platform, <span style={{ color: "#22c55e" }}>Dua Kampus</span>
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
          USU (35rb+) & POLMED (15rb+) → 50.000+ mahasiswa terlayani di satu marketplace terpadu
        </motion.p>

        {/* Campus Cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1.5rem",
            marginBottom: "3rem",
            maxWidth: "900px",
            width: "100%",
          }}
        >
          {campuses.map((campus, idx) => (
            <motion.div
              key={campus.code}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 + idx * 0.15 }}
              style={{
                flex: "1 1 260px",
                maxWidth: "280px",
                minHeight: "200px",
                borderRadius: "1rem",
                padding: "2rem",
                border: `1px solid ${campus.color}40`,
                background: `linear-gradient(135deg, ${campus.color}15 0%, ${campus.color}05 100%)`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute",
                top: "-20px",
                right: "-20px",
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: campus.color,
                opacity: 0.08,
              }} />
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}>
                <span style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: campus.color,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1.25rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  {campus.code.length > 4 ? campus.code.slice(0, 4) : campus.code}
                </span>
                <div>
                  <h3 style={{ margin: 0, color: "#f8fafc", fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.25rem" }}>
                    {campus.code}
                  </h3>
                  <p style={{ margin: "0.25rem 0 0", color: "#94a3b8", fontSize: "0.875rem" }}>
                    {campus.name}
                  </p>
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  color: campus.color,
                  fontWeight: 600,
                  fontSize: "1.5rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  {campus.students}
                </span>
                <span style={{ color: "#64748b", fontSize: "0.875rem", marginLeft: "0.5rem" }}>
                  mahasiswa
                </span>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                📍 {campus.location}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          style={{ maxWidth: "900px", width: "100%" }}
        >
          <h3 style={{
            textAlign: "center",
            color: "#f8fafc",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "2rem",
          }}>
            Fitur Multi-Kampus
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
          }}>
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 + idx * 0.08 }}
                style={{
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  background: "rgba(15, 23, 42, 0.6)",
                }}
              >
                <div style={{
                  fontSize: "2rem",
                  marginBottom: "0.75rem",
                  lineHeight: 1,
                }}>
                  {feature.icon}
                </div>
                <h4 style={{
                  margin: "0 0 0.5rem",
                  color: "#f8fafc",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "1rem",
                  fontWeight: 600,
                }}>
                  {feature.title}
                </h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.5 }}>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Flow Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          style={{ maxWidth: "900px", width: "100%", marginTop: "3rem" }}
        >
          <h3 style={{
            textAlign: "center",
            color: "#f8fafc",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "2rem",
          }}>
            Alur Pengguna Cross-Kampus
          </h3>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1rem",
          }}>
            {flow.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.6 + idx * 0.1 }}
                style={{
                  flex: "1 1 160px",
                  maxWidth: "180px",
                  textAlign: "center",
                  padding: "1.5rem 1rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  background: "rgba(15, 23, 42, 0.6)",
                  position: "relative",
                }}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #ef4444, #3b82f6)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  margin: "0 auto 1rem",
                }}>
                  {item.step}
                </div>
                <h4 style={{ margin: "0 0 0.5rem", color: "#f8fafc", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  {item.label}
                </h4>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.4 }}>
                  {item.detail}
                </p>
                {idx < flow.length - 1 && (
                  <div style={{
                    position: "absolute",
                    top: "20px",
                    right: "-24px",
                    color: "#22c55e",
                    fontSize: "1.5rem",
                    transform: "rotate(-90deg)",
                  }}>
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.2 }}
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem", marginTop: "3rem" }}
        >
          <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(239, 68, 68, 0.3)" }}>USU</span>
          <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(59, 130, 246, 0.3)" }}>POLMED</span>
          <span style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(34, 197, 94, 0.3)" }}>Unified</span>
          <span style={{ background: "rgba(168, 85, 247, 0.1)", color: "#a855f7", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(168, 85, 247, 0.3)" }}>Cross-Campus</span>
          <span style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(245, 158, 11, 0.3)" }}>Auto-Filter</span>
          <span style={{ background: "rgba(6, 182, 212, 0.1)", color: "#06b6d4", padding: "0.375rem 1rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 500, border: "1px solid rgba(6, 182, 212, 0.3)" }}>Targeted Push</span>
        </motion.div>
      </motion.div>
    </AbsoluteFill>
  );
};
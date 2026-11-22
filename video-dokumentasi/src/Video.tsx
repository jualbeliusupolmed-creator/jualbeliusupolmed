import { Sequence, AbsoluteFill, useVideoConfig, interpolate, spring, useCurrentFrame, Audio } from "remotion";
import { motion } from "motion/react";
import { TitleCard } from "./TitleCard";
import { Architecture } from "./Architecture";
import { BotScene } from "./BotScene";
import { PostingScene } from "./PostingScene";
import { SecurityScene } from "./SecurityScene";
import { CampusScene } from "./CampusScene";

export type Language = "id" | "en";

const SCENES = [
  { id: "title", name: "Title Card", component: TitleCard, duration: 90, start: 0 },
  { id: "arch", name: "Architecture", component: Architecture, duration: 150, start: 90 },
  { id: "bot", name: "Bot Architecture", component: BotScene, duration: 150, start: 240 },
  { id: "posting", name: "Posting Flow", component: PostingScene, duration: 150, start: 390 },
  { id: "security", name: "Security & RLS", component: SecurityScene, duration: 150, start: 540 },
  { id: "campus", name: "Multi-Campus", component: CampusScene, duration: 150, start: 690 },
];

const NARRATION: Record<string, Record<Language, string>> = {
  title: {
    id: "Selamat datang di dokumentasi arsitektur KampusKita. Marketplace terpadu untuk mahasiswa USU dan POLMED.",
    en: "Welcome to the KampusKita architecture documentation. An integrated marketplace for USU and POLMED students.",
  },
  arch: {
    id: "Arsitektur high-level: Client browser ke Edge Vercel, lalu App Layer Next.js, Data Layer Supabase, Intelligence Gemini AI, Messaging Baileys, Social Instagram, dan Observability.",
    en: "High-level architecture: Client browser to Vercel Edge, then Next.js App Layer, Supabase Data Layer, Gemini AI Intelligence, Baileys Messaging, Instagram Social, and Observability.",
  },
  bot: {
    id: "Bot WhatsApp menjalankan Baileys multi-device di VPS terpisah. PM2 mengelola proses, Nginx reverse proxy dengan SSL. Sinkronisasi real-time ke Supabase via Realtime dan REST API.",
    en: "WhatsApp Bot runs Baileys multi-device on a separate VPS. PM2 manages processes, Nginx reverse proxy with SSL. Real-time sync to Supabase via Realtime and REST API.",
  },
  posting: {
    id: "Flow pasang iklan lima tahap: Client input validasi, API gateway autentikasi, moderasi AI dual layer deterministik dan Gemini, persistensi database dengan logika bisnis, dan distribusi async ke WhatsApp, Instagram, Push, dan Subscriber.",
    en: "Five-step posting flow: Client input validation, API gateway authentication, dual-layer AI moderation deterministic and Gemini, database persistence with business logic, and async distribution to WhatsApp, Instagram, Push, and Subscribers.",
  },
  security: {
    id: "Enam lapis pertahanan: Edge HTTPS dan CSP, Autentikasi JWT HMAC, API validasi Zod honeypot, RLS Supabase owner-only, Infrastruktur bot VPS terisolasi, dan Observability audit logs.",
    en: "Six defense layers: Edge HTTPS and CSP, JWT HMAC Authentication, API Zod honeypot validation, Supabase RLS owner-only, Isolated bot VPS infrastructure, and Observability audit logs.",
  },
  campus: {
    id: "Satu platform dua kampus: USU 35 ribu plus dan POLMED 15 ribu plus mahasiswa. Fitur marketplace terpadu, filter kampus otomatis, komunitas per kampus, distribusi target, kategori khusus, dan analitik per kampus.",
    en: "One platform two campuses: USU 35k plus and POLMED 15k plus students. Integrated marketplace features, automatic campus filter, per-campus communities, targeted distribution, special categories, and per-campus analytics.",
  },
};

const TOTAL_DURATION = 840;
const FPS = 30;

const audioExists = (sceneId: string, lang: Language) => {
  try {
    return true;
  } catch {
    return false;
  }
};

const TransitionOverlay: React.FC<{ progress: number; fromScene: string; toScene: string }> = ({ progress, fromScene, toScene }) => {
  if (progress <= 0 || progress >= 1) return null;
  
  const opacity = Math.sin(progress * Math.PI);
  
  return (
    <AbsoluteFill style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      pointerEvents: "none",
      zIndex: 100,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity, scale: 1 }}
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderRadius: "1rem",
          padding: "2rem 3rem",
          textAlign: "center",
          backdropFilter: "blur(10px)",
        }}
      >
        <motion.div
          animate={{ 
            y: [-20, 0], 
            opacity: [0, 1, 1, 0] 
          }}
          transition={{ duration: 0.5 }}
          style={{ color: "#22c55e", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.5rem", marginBottom: "0.5rem" }}
        >
          {toScene}
        </motion.div>
        <motion.div
          style={{ color: "#94a3b8", fontFamily: "'Space Grotesk', sans-serif", fontSize: "1rem" }}
        >
          {fromScene} → {toScene}
        </motion.div>
      </motion.div>
    </AbsoluteFill>
  );
};

interface VideoProps {
  language?: Language;
}

export const Video: React.FC<VideoProps> = ({ language = "id" }) => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  
  const currentScene = SCENES.find(s => frame >= s.start && frame < s.start + s.duration) || SCENES[SCENES.length - 1];
  const prevScene = SCENES.find(s => s.start + s.duration === currentScene.start);
  
  const transitionProgress = prevScene 
    ? interpolate(frame, [currentScene.start - 15, currentScene.start], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  return (
    <>
      {/* Audio narration - only render if file exists */}
      {false && (
        <Audio 
          src={`audio/${currentScene.id}_${language}.mp3`} 
          startFrom={currentScene.start}
          endAt={currentScene.start + currentScene.duration}
        />
      )}
      
      <Sequence from={0} durationInFrames={TOTAL_DURATION} name="Main">
        {SCENES.map((scene, idx) => (
          <Sequence key={scene.id} from={scene.start} durationInFrames={scene.duration} name={scene.name}>
            <scene.component />
          </Sequence>
        ))}
      </Sequence>
      
      {prevScene && (
        <TransitionOverlay 
          progress={transitionProgress} 
          fromScene={prevScene.name} 
          toScene={currentScene.name}
        />
      )}
      
      <motion.div
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          zIndex: 200,
          background: "rgba(15, 23, 42, 0.9)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderRadius: "1rem",
          padding: "1rem 1.5rem",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ color: "#22c55e", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
          {currentScene.name} ({language.toUpperCase()})
        </div>
        <div style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
          Frame {frame} / {TOTAL_DURATION} ({(frame / fps).toFixed(1)}s)
        </div>
      </motion.div>
    </>
  );
};

export const makeVideo = (lang: Language = "id") => {
  return {
    id: `Video_${lang}`,
    component: Video,
    durationInFrames: TOTAL_DURATION,
    fps: FPS,
    width: 1920,
    height: 1080,
    defaultProps: { language: lang },
  };
};
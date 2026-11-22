const fs = require("fs");
const path = require("path");

const SCENES = [
  { id: "title", name: "Title Card", duration: 90, start: 0, narration: { id: "Selamat datang di dokumentasi arsitektur KampusKita. Marketplace terpadu untuk mahasiswa USU dan POLMED.", en: "Welcome to the KampusKita architecture documentation. An integrated marketplace for USU and POLMED students." } },
  { id: "arch", name: "Architecture", duration: 150, start: 90, narration: { id: "Arsitektur high-level: Client browser ke Edge Vercel, lalu App Layer Next.js, Data Layer Supabase, Intelligence Gemini AI, Messaging Baileys, Social Instagram, dan Observability.", en: "High-level architecture: Client browser to Vercel Edge, then Next.js App Layer, Supabase Data Layer, Gemini AI Intelligence, Baileys Messaging, Instagram Social, and Observability." } },
  { id: "bot", name: "Bot Architecture", duration: 150, start: 240, narration: { id: "Bot WhatsApp menjalankan Baileys multi-device di VPS terpisah. PM2 mengelola proses, Nginx reverse proxy dengan SSL. Sinkronisasi real-time ke Supabase via Realtime dan REST API.", en: "WhatsApp Bot runs Baileys multi-device on a separate VPS. PM2 manages processes, Nginx reverse proxy with SSL. Real-time sync to Supabase via Realtime and REST API." } },
  { id: "posting", name: "Posting Flow", duration: 150, start: 390, narration: { id: "Flow pasang iklan lima tahap: Client input validasi, API gateway autentikasi, moderasi AI dual layer deterministik dan Gemini, persistensi database dengan logika bisnis, dan distribusi async ke WhatsApp, Instagram, Push, dan Subscriber.", en: "Five-step posting flow: Client input validation, API gateway authentication, dual-layer AI moderation deterministic and Gemini, database persistence with business logic, and async distribution to WhatsApp, Instagram, Push, and Subscribers." } },
  { id: "security", name: "Security & RLS", duration: 150, start: 540, narration: { id: "Enam lapis pertahanan: Edge HTTPS dan CSP, Autentikasi JWT HMAC, API validasi Zod honeypot, RLS Supabase owner-only, Infrastruktur bot VPS terisolasi, dan Observability audit logs.", en: "Six defense layers: Edge HTTPS and CSP, JWT HMAC Authentication, API Zod honeypot validation, Supabase RLS owner-only, Isolated bot VPS infrastructure, and Observability audit logs." } },
  { id: "campus", name: "Multi-Campus", duration: 150, start: 690, narration: { id: "Satu platform dua kampus: USU 35 ribu plus dan POLMED 15 ribu plus mahasiswa. Fitur marketplace terpadu, filter kampus otomatis, komunitas per kampus, distribusi target, kategori khusus, dan analitik per kampus.", en: "One platform two campuses: USU 35k plus and POLMED 15k plus students. Integrated marketplace features, automatic campus filter, per-campus communities, targeted distribution, special categories, and per-campus analytics." } },
];

const AUDIO_DIR = path.join(__dirname, "../public/audio");

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

console.log("=== NARRATION SCRIPTS ===\n");

SCENES.forEach((scene) => {
  console.log(`--- ${scene.name} (${scene.duration} frames, ${(scene.duration/30).toFixed(1)}s) ---`);
  console.log(`ID: ${scene.narration.id}`);
  console.log(`EN: ${scene.narration.en}`);
  console.log("");
  
  const idFile = path.join(AUDIO_DIR, `${scene.id}_id.txt`);
  const enFile = path.join(AUDIO_DIR, `${scene.id}_en.txt`);
  fs.writeFileSync(idFile, scene.narration.id);
  fs.writeFileSync(enFile, scene.narration.en);
});

console.log("Text files saved to public/audio/");
console.log("\n=== NEXT STEPS ===");
console.log("1. Generate audio files (MP3/WAV) for each scene in both languages");
console.log("2. Name them: title_id.mp3, title_en.mp3, arch_id.mp3, etc.");
console.log("3. Place in public/audio/");
console.log("4. Update Video.tsx to use <Audio> components");
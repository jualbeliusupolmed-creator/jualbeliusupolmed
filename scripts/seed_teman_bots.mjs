import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const BOT_PROFILES = [
  {
    user_id: "bot_sarah_amelia_ti",
    display_name: "Sarah Amelia",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Fasilkom-TI",
    batch: "2023",
    intent: "Teman Belajar 📚",
    bio: "Lagi pusing tugas algoritma & python. Butuh partner ngoding sambil ngopi di Setiabudi ☕",
    instagram: "sarahameliati",
    whatsapp: "081260112233",
    photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 14,
    matches_count: 5,
  },
  {
    user_id: "bot_dimas_pratama_tm",
    display_name: "Dimas Pratama",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "USU",
    faculty: "Teknik",
    batch: "2022",
    intent: "Teman Nongkrong 🍔",
    bio: "Hobi futsal, motoran & cari kulineran malam di Dr. Mansyur. Gas aja dulu!",
    instagram: "dimaspratama_tm",
    whatsapp: "081260223344",
    photo_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 19,
    matches_count: 7,
  },
  {
    user_id: "bot_nabila_fk_24",
    display_name: "Nabila Azzahra",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Kedokteran",
    batch: "2024",
    intent: "Teman Santai ☕",
    bio: "Maba FK yang butuh asupan kafein dan circle positif di Medan 🩺",
    instagram: "nabilazzh",
    whatsapp: "081260334455",
    photo_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 28,
    matches_count: 11,
  },
  {
    user_id: "bot_kevin_polmed_elektro",
    display_name: "Kevin Wijaya",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "Polmed",
    faculty: "Teknik",
    batch: "2023",
    intent: "Partner Bisnis/Proyek 💼",
    bio: "Suka rakit IoT & mikrokontroler. Lagi nyari temen buat ikut lomba PKM / inovasi kampus 🚀",
    instagram: "kevinwjy.id",
    whatsapp: "081260445566",
    photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 12,
    matches_count: 4,
  },
  {
    user_id: "bot_tiara_feb_usu",
    display_name: "Tiara Putri",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Ekonomi & Bisnis",
    batch: "2023",
    intent: "Teman Curhat 💭",
    bio: "Suka hunting cafe aesthetic di sekitar Ringroad/Setiabudi. Let's be mutuals di IG ✨",
    instagram: "tiaraputri_feb",
    whatsapp: "081260556677",
    photo_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 35,
    matches_count: 14,
  },
  {
    user_id: "bot_rizky_polmed_ab",
    display_name: "Rizky Fauzi",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "Polmed",
    faculty: "Vokasi",
    batch: "2022",
    intent: "Teman Olahraga 🏃",
    bio: "Rutin jogging di Lapangan Merdeka / seputaran USU tiap weekend. Ayo hidup sehat bareng!",
    instagram: "rizkyfauzi_ab",
    whatsapp: "081260667788",
    photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 22,
    matches_count: 8,
  },
  {
    user_id: "bot_anisa_farmasi_usu",
    display_name: "Anisa Rahma",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Farmasi",
    batch: "2024",
    intent: "Teman Belajar 📚",
    bio: "Anak lab yang butuh refreshing. Suka matcha latte & dengerin indie pop 🎧",
    instagram: "anisarahma_ff",
    whatsapp: "081260778899",
    photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 31,
    matches_count: 9,
  },
  {
    user_id: "bot_fajar_sipil_usu",
    display_name: "Fajar Ramadhan",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "USU",
    faculty: "Teknik",
    batch: "2021",
    intent: "Teman Santai ☕",
    bio: "Tingkat akhir santai tapi pasti. Suka fotografi jalanan & street food malam.",
    instagram: "fajar_sipil21",
    whatsapp: "081260889900",
    photo_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 16,
    matches_count: 6,
  },
  {
    user_id: "bot_clarissa_fib_usu",
    display_name: "Clarissa Stefani",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Ilmu Budaya",
    batch: "2024",
    intent: "Teman Nongkrong 🍔",
    bio: "Sastra Inggris 24. Suka film arthouse, museum date & buku fiksi. Let's chat!",
    instagram: "clarissa.stef",
    whatsapp: "081260990011",
    photo_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 42,
    matches_count: 15,
  },
  {
    user_id: "bot_bayu_polmed_tekkom",
    display_name: "Bayu Aji",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "Polmed",
    faculty: "Teknik",
    batch: "2023",
    intent: "Partner Mabar 🎮",
    bio: "MLBB Mythic Immortal / Valorant Diamond. Butuh squad mabar anak kampus yang ga toxic!",
    instagram: "bayuaji_polmed",
    whatsapp: "081260001122",
    photo_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&auto=format&fit=crop&q=80",
    photo_urls: [
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&auto=format&fit=crop&q=80"
    ],
    is_active: true,
    likes_received: 25,
    matches_count: 10,
  },
];

async function run() {
  console.log("Seeding 10 mock bot profiles into teman_profiles...");

  for (const bot of BOT_PROFILES) {
    // Check if exists
    const { data: existing } = await supabase
      .from("teman_profiles")
      .select("id")
      .eq("user_id", bot.user_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("teman_profiles")
        .update(bot)
        .eq("id", existing.id)
        .select("id, display_name, campus, faculty");

      if (error) {
        console.error(`Error updating ${bot.display_name}:`, error.message);
      } else {
        console.log(`✓ Updated: ${bot.display_name} (${bot.campus} - ${bot.faculty}) [ID: ${data[0]?.id}]`);
      }
    } else {
      const { data, error } = await supabase
        .from("teman_profiles")
        .insert(bot)
        .select("id, display_name, campus, faculty");

      if (error) {
        console.error(`Error inserting ${bot.display_name}:`, error.message);
      } else {
        console.log(`✓ Inserted: ${bot.display_name} (${bot.campus} - ${bot.faculty}) [ID: ${data[0]?.id}]`);
      }
    }
  }

  console.log("Seeding complete! All 10 profiles are ready for swiping.");
}

run();

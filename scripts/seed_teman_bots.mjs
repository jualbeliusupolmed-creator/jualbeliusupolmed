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

// 10 Profil Mahasiswa Asli USU & POLMED dengan Vibes Lokal Medan Kental
const AUTHENTIC_MEDAN_STUDENTS = [
  {
    user_id: "bot_dinda_fk_usu",
    display_name: "Dinda Siregar",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Kedokteran",
    batch: "2023",
    intent: "Teman Santai ☕",
    bio: "Anak FK stase preklinik yg butuh napas bentar 💆‍♀️ Kalo ga di lab anatomi paling melipir ngopi di sekitaran Dr. Mansyur / Kopi Kenangan. Suka dengerin Hindia & hunting bakso enak Padang Bulan ✨",
    instagram: "dindasiregar__",
    whatsapp: "081260119922",
    photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=85",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 24,
    matches_count: 8,
  },
  {
    user_id: "bot_aldo_fasilkom_usu",
    display_name: "Aldo Sinaga",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "USU",
    faculty: "Fasilkom-TI",
    batch: "2022",
    intent: "Teman Belajar 📚",
    bio: "TI '22. Siap nemenin nugas, debugging Python/Nextjs, atau hunting mie aceh tengah malam di Pintu 2. Suka nongkrong di warkop Agam Multatuli / kopi susu Mansyur ☕💻",
    instagram: "aldosinaga.dev",
    whatsapp: "081260228833",
    photo_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 18,
    matches_count: 6,
  },
  {
    user_id: "bot_chika_feb_usu",
    display_name: "Chika Nababan",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Ekonomi & Bisnis",
    batch: "2024",
    intent: "Teman Nongkrong 🍔",
    bio: "Maba Manajemen FEB! Butuh temen muter-muter Pajus (Pajak USU) & cari kulineran murah meriah sekitaran Setiabudi. Suka foto-foto film camera & thrift hunting di Melati 📸✨",
    instagram: "chikanababan_",
    whatsapp: "081260337744",
    photo_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 38,
    matches_count: 14,
  },
  {
    user_id: "bot_fikri_polmed_mesin",
    display_name: "Fikri Harahap",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "Polmed",
    faculty: "Teknik",
    batch: "2022",
    intent: "Teman Olahraga 🏃",
    bio: "Anak Bengkel Polmed Gedung B. Rutin futsal di Champion Futsal / jogging sore di seputaran Pendopo USU. Gas mabar PES atau nongkrong warkop kelar praktikum!",
    instagram: "fikri_harahap22",
    whatsapp: "081260446655",
    photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 15,
    matches_count: 5,
  },
  {
    user_id: "bot_rani_farmasi_usu",
    display_name: "Syahrani Azzahra",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Farmasi",
    batch: "2023",
    intent: "Teman Curhat 💭",
    bio: "Hari-hari bau alkohol lab & titrasi 🧪 Kalau suntuk larinya ke cafe aesthetic Ringroad atau jajan dimsum Ayong. Butuh temen ngobrol deep talk tentang hidup & dengerin Nadin Amizah 🎧",
    instagram: "syahranizzhra",
    whatsapp: "081260555566",
    photo_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 45,
    matches_count: 16,
  },
  {
    user_id: "bot_bagus_polmed_tekkom",
    display_name: "Bagus Surya",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "Polmed",
    faculty: "Teknik",
    batch: "2023",
    intent: "Partner Mabar 🎮",
    bio: "Anak Polmed Kos Gang Susuk 🏠 Mythic Glory MLBB / Valorant Diamond. Tiap kelar kelas nongkrong di Warkop deket Pintu 4. Gas mabar atau ngerjain project IoT!",
    instagram: "bagussurya.id",
    whatsapp: "081260664477",
    photo_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 26,
    matches_count: 9,
  },
  {
    user_id: "bot_putri_hukum_usu",
    display_name: "Putri Anggraini",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Hukum",
    batch: "2022",
    intent: "Teman Santai ☕",
    bio: "FH USU '22 ⚖️ Suka ngopi santai di Dr. Mansyur sehabis kuliah hukum perdata. Pecinta kopi susu dingin, kucing jalanan kampus USU, & sunsetan di Danau Toba kalau libur semester 🍃",
    instagram: "putrianggrn_fh",
    whatsapp: "081260773388",
    photo_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 33,
    matches_count: 11,
  },
  {
    user_id: "bot_rafi_fp_usu",
    display_name: "Rafi Zulkarnain",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "USU",
    faculty: "Pertanian",
    batch: "2021",
    intent: "Partner Bisnis/Proyek 💼",
    bio: "FP USU tingkat akhir. Lagi riset hidroponik & punya usaha kecil-kecilan di Medan. Butuh relasi buat kolaborasi event kampus atau ide bisnis FnB. Santai tapi visioner 🚀",
    instagram: "rafizulkrn",
    whatsapp: "081260882299",
    photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 20,
    matches_count: 7,
  },
  {
    user_id: "bot_keke_fib_usu",
    display_name: "Keisha Aurelia (Keke)",
    gender: "Perempuan",
    target_gender: "all",
    campus: "USU",
    faculty: "Ilmu Budaya",
    batch: "2024",
    intent: "Teman Nongkrong 🍔",
    bio: "Sastra Inggris 2024! Anak perantauan Jakarta yg lagi adaptasi sama logat Medan wkwk. Suka museum date ke Tjong A Fie, thrift di Pajak Melati, & nyari mie balap seafood terenak 🍜",
    instagram: "keishaaurell",
    whatsapp: "081260991100",
    photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 50,
    matches_count: 19,
  },
  {
    user_id: "bot_teguh_polmed_ab",
    display_name: "Teguh Pratama",
    gender: "Laki-laki",
    target_gender: "all",
    campus: "Polmed",
    faculty: "Vokasi",
    batch: "2023",
    intent: "Teman Santai ☕",
    bio: "Anak AB Polmed. Spesialis penikmat roti bakar warkop & teh manis dingin tengah malam di Jalan Abdullah Lubis. Suka touring motoran ke Berastagi pas weekend 🛵🌲",
    instagram: "teguhpratama_ab",
    whatsapp: "081260009911",
    photo_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=85",
    photo_urls: [
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=85"
    ],
    is_active: true,
    likes_received: 29,
    matches_count: 10,
  },
];

async function run() {
  console.log("Seeding authentic USU & POLMED student profiles...");

  // Hapus bot lama jika ada agar bersih
  await supabase.from("teman_profiles").delete().like("user_id", "bot_%");

  for (const bot of AUTHENTIC_MEDAN_STUDENTS) {
    const { data, error } = await supabase
      .from("teman_profiles")
      .insert(bot)
      .select("id, display_name, campus, faculty");

    if (error) {
      console.error(`Error inserting ${bot.display_name}:`, error.message);
    } else {
      console.log(`✓ [USU/POLMED ASLI] ${bot.display_name} (${bot.campus} - ${bot.faculty} '${bot.batch}) [ID: ${data[0]?.id}]`);
    }
  }

  console.log("Seeding authentic profiles complete! Deck is now full of real Medan campus vibes.");
}

run();

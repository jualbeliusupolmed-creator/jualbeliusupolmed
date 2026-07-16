import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// Initialize the Gemini API
const geminiApiKey = (process.env.GEMINI_API_KEY || "").replace(/^\uFEFF/, '').trim();
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Initialize the OpenAI API
const openaiApiKey = (process.env.OPENAI_API_KEY || "").replace(/^\uFEFF/, '').trim();
const openai = new OpenAI({ apiKey: openaiApiKey || "dummy_key_to_prevent_build_crash" });

// Ekstrak JSON dari respons AI secara robust
function extractJsonFromResponse(text) {
  let clean = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
  try { return JSON.parse(clean); } catch (_) {}
  // Fallback: cari objek JSON pertama dalam teks
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new SyntaxError("No valid JSON found in AI response: " + clean.slice(0, 100));
}

// Build array of models to try based on config
function buildModelsToTry(aiConfig = {}) {
  const mode = aiConfig.provider_mode || "hybrid_gemini_first";
  const geminiModel = aiConfig.gemini_model || aiConfig.model || "gemini-2.5-flash";
  const openaiModel = aiConfig.openai_model || "gpt-4o-mini";
  const geminiFallback = "gemini-2.5-flash-lite";

  if (mode === "gemini_only") return [{ provider: "gemini", model: geminiModel }, { provider: "gemini", model: geminiFallback }];
  if (mode === "openai_only") return [{ provider: "openai", model: openaiModel }, { provider: "openai", model: "gpt-4o" }];
  if (mode === "hybrid_openai_first") return [{ provider: "openai", model: openaiModel }, { provider: "gemini", model: geminiModel }, { provider: "gemini", model: geminiFallback }];
  
  // default: hybrid_gemini_first
  return [{ provider: "gemini", model: geminiModel }, { provider: "gemini", model: geminiFallback }, { provider: "openai", model: openaiModel }];
}

// Eksekusi logika hybrid AI
async function executeHybridAI(modelsToTry, prompt, { imageBuffers = [], mimeTypes = [], memoryContext = "", personalityContext = "" } = {}) {
  let attempt = 0;
  const maxRetries = modelsToTry.length;

  while (attempt < maxRetries) {
    const currentTry = modelsToTry[attempt];
    try {
      if (currentTry.provider === "gemini") {
        const model = genAI.getGenerativeModel({ model: currentTry.model });
        
        const contentParts = [prompt];
        if (imageBuffers && mimeTypes && imageBuffers.length === mimeTypes.length) {
          for (let i = 0; i < imageBuffers.length; i++) {
            contentParts.push({
              inlineData: {
                data: imageBuffers[i].toString("base64"),
                mimeType: mimeTypes[i]
              }
            });
          }
        }

        const result = await model.generateContent(contentParts);
        return extractJsonFromResponse(result.response.text());

      } else if (currentTry.provider === "openai") {
        const messages = [];
        if (memoryContext) messages.push({ role: "system", content: "Pengetahuan Sistem:\n" + memoryContext });
        if (personalityContext) messages.push({ role: "system", content: "Kepribadian:\n" + personalityContext });
        
        const content = [{ type: "text", text: prompt }];
        if (imageBuffers && mimeTypes && imageBuffers.length === mimeTypes.length) {
          for (let i = 0; i < imageBuffers.length; i++) {
            content.push({
              type: "image_url",
              image_url: {
                url: `data:${mimeTypes[i]};base64,${imageBuffers[i].toString("base64")}`
              }
            });
          }
        }
        messages.push({ role: "user", content });

        const completion = await openai.chat.completions.create({
          model: currentTry.model,
          messages: messages,
          response_format: { type: "json_object" }
        });
        
        return extractJsonFromResponse(completion.choices[0].message.content);
      }
    } catch (error) {
      attempt++;
      console.error(`[Hybrid AI] Error attempt ${attempt}/${maxRetries} using ${currentTry.provider}/${currentTry.model}:`, error.message);
      
      const isRetryable = error.message.includes("503") || error.message.includes("429") || error instanceof SyntaxError || error.status === 429 || error.status >= 500 || error.message.includes("quota") || error.message.includes("RateLimit");
      
      if (isRetryable && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      
      if (attempt >= maxRetries) {
        throw new Error("Semua provider AI (Gemini & OpenAI) sedang sibuk atau limit tercapai. Silakan coba sesaat lagi.");
      }
    }
  }
}

/**
 * Validates a receipt image using Hybrid Vision AI.
 */
export async function verifyReceiptImage(imageBuffer, mimeType) {
  const modelsToTry = buildModelsToTry({});
  const prompt = `
    Anda adalah asisten validasi pembayaran yang cerdas.
    Tugas Anda adalah membaca gambar struk transfer bank atau e-wallet (GoPay, Dana, OVO, ShopeePay, BCA, dll).
    
    Cari 2 informasi penting ini:
    1. Nominal/Jumlah transfer (pastikan ini adalah total yang ditransfer, bukan sisa saldo).
    2. Nama penerima transfer.
    
    Aturan ketat:
    - Kembalikan jawaban Anda HANYA dalam format JSON MURNI tanpa markdown, tanpa teks lain.
    - Format JSON yang diminta:
    {
      "nominal": <angka murni tanpa titik/koma, contoh: 5012>,
      "penerima": "<nama penerima, kosongkan jika tidak terbaca>",
      "is_struk_valid": <boolean, true jika ini benar-benar struk transfer, false jika ini foto selfie atau foto acak>
    }
  `;

  return executeHybridAI(modelsToTry, prompt, { imageBuffers: [imageBuffer], mimeTypes: [mimeType] });
}

/**
 * Parses raw text from a WhatsApp message into a structured JSON for a listing.
 */
export async function parseListingFromText(text, aiConfig = {}, imageBuffers = [], mimeTypes = []) {
  const modelsToTry = buildModelsToTry(aiConfig);
  const memoryContext = aiConfig.memory ? `\nPengetahuan Sistem (Memory):\n${aiConfig.memory}\n` : "";
  const personalityContext = aiConfig.personality ? `\nKepribadian & Gaya Bicara Anda:\n${aiConfig.personality}\n` : "";

  const prompt = `
    Anda adalah asisten marketplace yang cerdas.
    Tugas Anda adalah membaca pesan chat dan/atau beberapa gambar dari pengguna yang ingin mengiklankan barang dagangan mereka.
    Pengguna mungkin mengirimkan SATU barang, atau BEBERAPA barang berbeda sekaligus.
    Jika gambar berisi teks (misalnya screenshot spesifikasi atau pamflet), bacalah teks pada gambar tersebut untuk mendapatkan detail barang.
    Bila ada banyak gambar, identifikasi apakah gambar-gambar tersebut adalah barang yang berbeda-beda, atau hanya sudut pandang lain dari barang yang sama.
    ${memoryContext}
    ${personalityContext}
    
    ${text ? `Pesan pengguna:\n"""\n${text}\n"""` : 'Pesan pengguna kosong. Harap ekstrak informasi HANYA dari teks/visual pada gambar yang dilampirkan.'}
    
    Ekstrak informasi dari pesan dan/atau gambar di atas, lalu kembalikan dalam format JSON berisi daftar "items" (berisi barang yang diiklankan) dan sebuah pesan "reply_message".
    Setiap item dalam "items" harus memiliki properti berikut:
    - "title": Nama atau judul barang (maks 50 karakter).
    - "price": Harga barang dalam angka murni (contoh: 50000). Jika nego atau tidak jelas, tebak dari konteks atau isi 0.
    - "description": Deksripsi lengkap barang. Jika ada informasi kontak, hapus informasi kontaknya. Tuliskan kembali detail spesifikasi yang ada di gambar ke dalam deskripsi ini secara rapi.
    - "category": Pilih salah satu kategori paling cocok dari list berikut: ["Elektronik", "Fashion", "Kendaraan", "Properti", "Buku", "Makanan", "Jasa", "Lainnya"]. Default: "Lainnya".
    - "condition": Kondisi barang. Gunakan "new" jika baru/segel/belum dipakai, "used" jika bekas/second/pernah dipakai. Default: "used".
    - "campus": Kampus atau area yang disebutkan. Normalisasi ke salah satu: "USU", "POLMED", atau "Semua". Default: "Semua".
    
    Sertakan juga "reply_message" di luar array "items":
    - "reply_message": Tuliskan pesan balasan ramah yang merangkum APA SAJA barang yang sudah dicatat, dan beritahu harganya. WAJIB patuhi Kepribadian & Gaya Bicara di atas! Jangan tulis instruksi bayar di teks ini (akan ditambahkan otomatis).
    
    Aturan ketat:
    - Kembalikan jawaban Anda HANYA dalam format JSON MURNI tanpa markdown.
    - Contoh output: 
    {
      "items": [
        { "title": "iPhone 12 Mulus", "price": 5000000, "description": "Lecet pemakaian", "category": "Elektronik", "condition": "used", "campus": "Semua" },
        { "title": "Helm Bogo Hitam", "price": 150000, "description": "Baru dipakai 2 kali", "category": "Kendaraan", "condition": "used", "campus": "USU" }
      ],
      "reply_message": "Siap kak! iPhone 12 dan Helm Bogo udah aku catat nih detailnya. Tunggu sebentar ya! 🚀"
    }
  `;

  return executeHybridAI(modelsToTry, prompt, { imageBuffers, mimeTypes, memoryContext: aiConfig.memory, personalityContext: aiConfig.personality });
}

/**
 * Parses raw text from a WhatsApp message to determine if it's a general chat or a search query.
 */
export async function processGeneralChat(text, aiConfig = {}, history = []) {
  const modelsToTry = buildModelsToTry(aiConfig);
  const memoryContext = aiConfig.memory ? `\nPengetahuan Sistem (Memory):\n${aiConfig.memory}\n` : "";
  const personalityContext = aiConfig.personality ? `\nKepribadian & Gaya Bicara Anda:\n${aiConfig.personality}\n` : "";

  const historyContext = history && history.length > 0
    ? "\nRiwayat Percakapan Sebelumnya (untuk konteks):\n" +
      history.map(h => `${h.role === "user" ? "User" : "Bot"}: ${h.text}`).join("\n") + "\n"
    : "";

  const prompt = `
    Anda adalah asisten cerdas untuk marketplace kampus (Jual Beli USU/Polmed).
    Tugas Anda adalah merespons chat dari pengguna WhatsApp.
    ${memoryContext}
    ${personalityContext}
    ${historyContext}

    Pesan pengguna saat ini:
    """
    ${text}
    """

    Analisis pesan tersebut dan tentukan niat (intent) pengguna.
    Jika pengguna MENCARI barang (contoh: "cari motor", "ada kos kosong?", "jual laptop murah", "WTS/WTB"), intent adalah "search".
    Jika pengguna SECARA EKSPLISIT minta bicara dengan MANUSIA/ADMIN atau KOMPLAIN serius (contoh: "tolong panggil admin manusia", "saya mau komplain", "saya mau lapor", "minta tolong admin", "hubungi admin", "ada masalah dengan iklan saya"), intent adalah "handoff". JANGAN handoff hanya karena user menyapa dengan "admin", "min", atau "mimin" — itu hanya sapaan biasa ke bot.
    Jika pengguna HANYA NGOBROL biasa selain di atas (contoh: "halo", "selamat pagi", "cara pasang iklan gimana?"), intent adalah "chat".

    Ekstrak ke format JSON:
    {
      "intent": "search", "handoff", atau "chat",
      "keywords": "kata kunci pencarian jika intent=search, HARUS berisi kata benda barangnya saja (bukan kalimat penuh)",
      "category": "kategori yang paling cocok dari: Elektronik, Fashion, Kendaraan, Properti, Buku, Makanan, Jasa, Lainnya — kosongkan jika tidak jelas",
      "reply_message": "Balasan ramah sesuai Kepribadian Anda. Jika search, beri pengantar singkat. Jika handoff, balas bahwa pesan diteruskan ke Admin. Jika chat, jawab dengan luwes berdasarkan konteks percakapan."
    }

    Aturan ketat:
    - Kembalikan jawaban Anda HANYA dalam format JSON MURNI tanpa markdown, tanpa teks lain.
    - Contoh output search: {"intent": "search", "keywords": "motor bekas", "category": "Kendaraan", "reply_message": "Siap kak! Tunggu sebentar ya, aku carikan motor bekas yang lagi dijual."}
    - Contoh output handoff: {"intent": "handoff", "keywords": "", "category": "", "reply_message": "Baik kak, pesan ini diteruskan ke Admin Manusia. Bot akan diam dulu ya sampai Admin membalas!"}
    - Contoh output chat: {"intent": "chat", "keywords": "", "category": "", "reply_message": "Halo kak! Aku asisten Jual Beli USU/Polmed. Ada yang bisa aku bantu?"}
  `;

  return executeHybridAI(modelsToTry, prompt, { memoryContext: aiConfig.memory, personalityContext: aiConfig.personality });
}

/**
 * Parse pesan "DICARI ..." dari WA menjadi data wanted listing terstruktur.
 */
export async function parseWantedFromText(text) {
  const modelsToTry = buildModelsToTry({});
  const prompt = `
    Ekstrak informasi dari pesan berikut yang berisi permintaan barang yang dicari:
    """${text}"""

    Kembalikan HANYA JSON MURNI (tanpa markdown):
    {
      "title": "nama/jenis barang yang dicari (singkat, maks 60 karakter)",
      "description": "deskripsi lengkap kebutuhan jika ada",
      "budget": <angka budget/harga maks dalam rupiah, 0 jika tidak disebutkan. PENTING: pahami singkatan uang. "500" atau "500rb" atau "500k" = 500000; "2jt" atau "2 juta" = 2000000. Angka polos kecil pada konteks budget mahasiswa hampir pasti dalam ribuan (mis. "budget 500" = 500000)>,
      "category": "salah satu dari: Elektronik, Fashion, Kendaraan, Properti, Buku, Makanan, Jasa, Lainnya",
      "campus": "Kampus atau area yang disebutkan. Normalisasi ke: USU, POLMED, atau Semua. Default: Semua"
    }
  `;
  try {
    const result = await executeHybridAI(modelsToTry, prompt);
    // Jaring pengaman: angka budget polos < 1000 tidak masuk akal untuk barang apa pun
    // (Rp 500?), hampir pasti maksudnya ribuan. Kalikan 1000. Kasus nyata: "budget 500" → Rp 500.
    const b = Number(result?.budget);
    if (result && b > 0 && b < 1000) result.budget = b * 1000;
    return result;
  } catch (err) {
    return { title: text.slice(0, 60), description: "", budget: 0, category: "Lainnya", campus: "Semua" };
  }
}


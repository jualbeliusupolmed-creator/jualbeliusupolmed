import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API with the API key from environment variables
const apiKey = (process.env.GEMINI_API_KEY || "").replace(/^\uFEFF/, '').trim();
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Validates a receipt image using Gemini Vision AI.
 * @param {Buffer} imageBuffer - The binary buffer of the uploaded image
 * @param {string} mimeType - The MIME type of the image (e.g., "image/jpeg", "image/png")
 * @returns {Promise<Object>} JSON object containing extracted data { nominal, penerima, is_struk_valid }
 */
export async function verifyReceiptImage(imageBuffer, mimeType, maxRetries = 3) {
  let attempt = 0;
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite"
  ];
  
  while (attempt < maxRetries) {
    try {
      const modelName = modelsToTry[attempt] || modelsToTry[modelsToTry.length - 1];
      const model = genAI.getGenerativeModel({ model: modelName });

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

      const imageParts = [
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType
          },
        },
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      const responseText = result.response.text();
      
      // Parse JSON safely by removing markdown code blocks if any
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
      
    } catch (error) {
      const modelFailed = modelsToTry[attempt] || modelsToTry[modelsToTry.length - 1];
      attempt++;
      console.error(`Gemini AI Error (Attempt ${attempt}/${maxRetries} using ${modelFailed}):`, error.message);
      
      const isRateLimitOrOverload = error.message.includes("503") || error.message.includes("429");
      
      if (isRateLimitOrOverload && attempt < maxRetries) {
        // Fallback to next lighter model immediately with 1s delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      
      throw new Error("Gagal memproses struk dengan AI. Server Google sedang penuh, silakan coba lagi dalam beberapa menit.");
    }
  }
}

/**
 * Parses raw text from a WhatsApp message into a structured JSON for a listing.
 * @param {string} text - The raw text message from the user
 * @returns {Promise<Object>} JSON object containing extracted data { title, price, description, category }
 */
export async function parseListingFromText(text, aiConfig = {}, maxRetries = 3) {
  let attempt = 0;
  const primaryModel = aiConfig.model || "gemini-2.5-flash";
  const modelsToTry = [
    primaryModel,
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite"
  ];
  
  const memoryContext = aiConfig.memory ? `\nPengetahuan Sistem (Memory):\n${aiConfig.memory}\n` : "";
  const personalityContext = aiConfig.personality ? `\nKepribadian & Gaya Bicara Anda:\n${aiConfig.personality}\n` : "";

  while (attempt < maxRetries) {
    try {
      const modelName = modelsToTry[attempt] || modelsToTry[modelsToTry.length - 1];
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
        Anda adalah asisten marketplace yang cerdas.
        Tugas Anda adalah membaca pesan chat dari pengguna yang ingin mengiklankan barang dagangan mereka.
        ${memoryContext}
        ${personalityContext}
        
        Pesan pengguna:
        """
        ${text}
        """
        
        Ekstrak informasi penting dari pesan di atas menjadi format JSON:
        - "title": Nama atau judul barang (maks 50 karakter).
        - "price": Harga barang dalam angka murni (contoh: 50000). Jika nego atau tidak jelas, tebak dari konteks atau isi 0.
        - "description": Deksripsi lengkap barang. Jika ada informasi kontak, hapus informasi kontaknya.
        - "category": Pilih salah satu kategori paling cocok dari list berikut: ["Elektronik", "Fashion", "Kendaraan", "Properti", "Buku", "Makanan", "Jasa", "Lainnya"]. Default: "Lainnya".
        - "reply_message": Tuliskan pesan balasan yang ramah kepada pengguna untuk mengkonfirmasi bahwa detail iklannya (nama barang, harga) sudah dicatat. WAJIB patuhi Kepribadian & Gaya Bicara di atas! Jangan tulis instruksi bayar di teks ini (akan ditambahkan otomatis oleh sistem).
        
        Aturan ketat:
        - Kembalikan jawaban Anda HANYA dalam format JSON MURNI tanpa markdown, tanpa teks lain.
        - Contoh output: {"title": "iPhone 12 Mulus", "price": 5000000, "description": "Lecet pemakaian", "category": "Elektronik", "reply_message": "Siap kak! iPhone 12 mulus udah aku catat nih detailnya. Tunggu sebentar ya! 🚀"}
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
      
    } catch (error) {
      const modelFailed = modelsToTry[attempt] || modelsToTry[modelsToTry.length - 1];
      attempt++;
      console.error(`Gemini AI Text Error (Attempt ${attempt}/${maxRetries} using ${modelFailed}):`, error.message);
      
      const isRateLimitOrOverload = error.message.includes("503") || error.message.includes("429");
      
      if (isRateLimitOrOverload && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      
      throw new Error("Gagal mengekstrak data iklan menggunakan AI. Silakan coba lagi nanti.");
    }
  }
}

/**
 * Parses raw text from a WhatsApp message to determine if it's a general chat or a search query.
 * @param {string} text - The raw text message from the user
 * @param {Object} aiConfig - AI configuration containing memory and personality
 * @returns {Promise<Object>} JSON object containing extracted data { intent, keywords, reply_message }
 */
export async function processGeneralChat(text, aiConfig = {}, history = [], maxRetries = 3) {
  let attempt = 0;
  const primaryModel = aiConfig.model || "gemini-2.5-flash";
  const modelsToTry = [
    primaryModel,
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite"
  ];

  const memoryContext = aiConfig.memory ? `\nPengetahuan Sistem (Memory):\n${aiConfig.memory}\n` : "";
  const personalityContext = aiConfig.personality ? `\nKepribadian & Gaya Bicara Anda:\n${aiConfig.personality}\n` : "";

  // Bangun riwayat percakapan sebagai teks konteks
  const historyContext = history && history.length > 0
    ? "\nRiwayat Percakapan Sebelumnya (untuk konteks):\n" +
      history.map(h => `${h.role === "user" ? "User" : "Bot"}: ${h.text}`).join("\n") + "\n"
    : "";

  while (attempt < maxRetries) {
    try {
      const modelName = modelsToTry[attempt] || modelsToTry[modelsToTry.length - 1];
      const model = genAI.getGenerativeModel({ model: modelName });

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
        Jika pengguna INGIN BICARA DENGAN ADMIN/MANUSIA atau KOMPLAIN (contoh: "halo admin", "tolong panggil admin", "min kok iklan saya gak tayang", "ini bot ya", "saya mau lapor"), intent adalah "handoff".
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

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);

    } catch (error) {
      const modelFailed = modelsToTry[attempt] || modelsToTry[modelsToTry.length - 1];
      attempt++;
      console.error(`Gemini AI Chat Error (Attempt ${attempt}/${maxRetries} using ${modelFailed}):`, error.message);

      const isRateLimitOrOverload = error.message.includes("503") || error.message.includes("429");

      if (isRateLimitOrOverload && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      throw new Error("Gagal merespons pesan menggunakan AI. Silakan coba lagi nanti.");
    }
  }
}

/**
 * Suggest a fair price for a new listing based on similar active listings.
 * @param {string} title - Judul barang
 * @param {string} category - Kategori barang
 * @param {Array} similarPrices - Array angka harga dari listing serupa
 * @returns {Promise<Object>} { suggested_price, range_min, range_max, note }
 */
export async function suggestPrice(title, category, similarPrices = [], maxRetries = 2) {
  if (!similarPrices || similarPrices.length === 0) return null;

  let attempt = 0;
  const modelsToTry = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];

  while (attempt < maxRetries) {
    try {
      const modelName = modelsToTry[attempt] || modelsToTry[modelsToTry.length - 1];
      const model = genAI.getGenerativeModel({ model: modelName });

      const priceList = similarPrices.map(p => `Rp ${Number(p).toLocaleString("id-ID")}`).join(", ");

      const prompt = `
        Anda adalah analis harga marketplace. Berikan saran harga untuk barang berikut:
        - Nama barang: ${title}
        - Kategori: ${category}
        - Harga iklan serupa di marketplace yang sedang aktif: ${priceList}

        Tentukan harga yang wajar berdasarkan referensi di atas.

        Kembalikan HANYA JSON MURNI (tanpa markdown):
        {
          "suggested_price": <angka harga yang paling wajar>,
          "range_min": <batas bawah harga wajar>,
          "range_max": <batas atas harga wajar>,
          "note": "catatan singkat (maks 80 karakter) mengapa harga ini direkomendasikan"
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);

    } catch (error) {
      attempt++;
      const isRateLimit = error.message.includes("503") || error.message.includes("429");
      if (isRateLimit && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      console.warn("[suggestPrice] gagal:", error.message);
      return null;
    }
  }
  return null;
}

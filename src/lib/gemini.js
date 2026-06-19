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

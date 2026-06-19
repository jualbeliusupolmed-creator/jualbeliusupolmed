import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Validates a receipt image using Gemini Vision AI.
 * @param {Buffer} imageBuffer - The binary buffer of the uploaded image
 * @param {string} mimeType - The MIME type of the image (e.g., "image/jpeg", "image/png")
 * @returns {Promise<Object>} JSON object containing extracted data { nominal, penerima, is_struk_valid }
 */
export async function verifyReceiptImage(imageBuffer, mimeType) {
  try {
    // We use gemini-1.5-flash to ensure compatibility with all new API keys
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    console.error("Gemini AI Error:", error);
    throw new Error("Gagal memproses struk dengan AI. " + (error?.message || ""));
  }
}

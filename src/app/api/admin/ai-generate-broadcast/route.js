import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { instruction } = await req.json();
    if (!instruction?.trim()) {
      return NextResponse.json({ error: "Instruksi tidak boleh kosong" }, { status: 400 });
    }
    if (instruction.length > 300) {
      return NextResponse.json({ error: "Instruksi terlalu panjang (maks 300 karakter)" }, { status: 400 });
    }

    const settings = await getSettings();
    const config = settings.ai_config || {};
    const modelName = config.model || "gemini-2.5-flash";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY belum dikonfigurasi");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `Kamu adalah AI pembuat teks promosi (broadcast WhatsApp) untuk marketplace Jual Beli USU.
Tugas kamu adalah membuat sebuah teks pesan broadcast WhatsApp berdasarkan instruksi admin berikut:
"${instruction.trim()}"

Gunakan memori dan kepribadian berikut untuk menyesuaikan nada bicara kamu:
Memori (Fakta): ${config.memory || ""}
Kepribadian: ${config.personality || ""}

ATURAN:
1. Buat teks yang menarik, terstruktur dengan baik (gunakan paragraf, bold *teks*, italic _teks_).
2. Jangan terlalu panjang, langsung ke intinya (maksimal 3-4 paragraf pendek).
3. Gunakan emoji yang relevan.
4. Jangan menulis pengantar seperti "Berikut adalah pesan broadcastnya", langsung berikan teks hasilnya saja.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    console.error("AI Generate Broadcast Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghasilkan teks broadcast" },
      { status: 500 }
    );
  }
}

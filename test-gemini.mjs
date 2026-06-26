import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Halo, coba balas ini.");
    console.log(result.response.text());
  } catch (error) {
    console.error("Error gemini-1.5-flash:", error.message);
  }
}

testGemini();

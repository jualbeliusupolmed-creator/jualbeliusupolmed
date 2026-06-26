const apiKey = process.env.GEMINI_API_KEY || "";
async function fetchModels() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  console.log(data.models?.map(m => m.name).join("\n"));
}
fetchModels();

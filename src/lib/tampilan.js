// Preferensi tampilan yang dipegang pengguna sendiri: tema dan ukuran teks.
// Keduanya disimpan di localStorage dan dibaca ulang oleh skrip kecil di
// layout.jsx sebelum halaman digambar, supaya tidak ada kedip putih.

export const KUNCI_TEMA = "theme";
export const KUNCI_SKALA = "text-scale";

export const SKALA_TEKS = [
  { id: "kecil", label: "Kecil", nilai: 0.92 },
  { id: "normal", label: "Normal", nilai: 1 },
  { id: "besar", label: "Besar", nilai: 1.12 },
  { id: "jumbo", label: "Jumbo", nilai: 1.24 },
];

export function bacaSkala() {
  if (typeof window === "undefined") return "normal";
  try {
    const s = localStorage.getItem(KUNCI_SKALA);
    return SKALA_TEKS.some((x) => x.id === s) ? s : "normal";
  } catch {
    return "normal";
  }
}

export function terapkanSkala(id) {
  if (typeof document === "undefined") return;
  const skala = SKALA_TEKS.find((x) => x.id === id) || SKALA_TEKS[1];
  document.documentElement.style.fontSize = `${16 * skala.nilai}px`;
  try {
    localStorage.setItem(KUNCI_SKALA, skala.id);
  } catch {}
}

// Default pertama: "terang" (Light Mode).
// Hanya beralih ke "gelap" jika secara tegas dipilih oleh pengguna.
export function bacaTema() {
  if (typeof window === "undefined") return "terang";
  try {
    const t = localStorage.getItem(KUNCI_TEMA);
    if (t === "dark" || t === "gelap") return "gelap";
    if (t === "light" || t === "terang") return "terang";
    return "terang"; // default pertama adalah terang
  } catch {
    return "terang";
  }
}

export function temaGelapAktif(mode) {
  if (mode === "gelap") return true;
  return false; // default pertama: false (terang)
}

export function terapkanTema(mode) {
  if (typeof document === "undefined") return false;
  const gelap = mode === "gelap";
  document.documentElement.classList.toggle("dark", gelap);
  try {
    localStorage.setItem(KUNCI_TEMA, gelap ? "dark" : "light");
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("theme:change", { detail: { dark: gelap, mode: gelap ? "gelap" : "terang" } }));
  }
  return gelap;
}


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

// "sistem" mengikuti setelan HP; "terang"/"gelap" adalah pilihan tegas pengguna.
export function bacaTema() {
  if (typeof window === "undefined") return "sistem";
  try {
    const t = localStorage.getItem(KUNCI_TEMA);
    if (t === "dark" || t === "gelap") return "gelap";
    if (t === "light" || t === "terang") return "terang";
    return "sistem";
  } catch {
    return "sistem";
  }
}

export function temaGelapAktif(mode) {
  if (mode === "gelap") return true;
  if (mode === "terang") return false;
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function terapkanTema(mode) {
  if (typeof document === "undefined") return;
  const gelap = temaGelapAktif(mode);
  document.documentElement.classList.toggle("dark", !!gelap);
  try {
    // Nilai lama ("dark"/"light") tetap ditulis supaya kode lain yang
    // membaca kunci ini tidak bingung.
    if (mode === "sistem") localStorage.removeItem(KUNCI_TEMA);
    else localStorage.setItem(KUNCI_TEMA, mode === "gelap" ? "dark" : "light");
  } catch {}
  return gelap;
}

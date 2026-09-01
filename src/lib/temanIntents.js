export const TEMAN_INTENTS = [
  { value: "Teman Santai", legacy: "Teman Santai ☕", icon: "Coffee" },
  { value: "Belajar Bareng", legacy: "Belajar Bareng 📚", icon: "BookOpen" },
  { value: "Teman Olahraga", legacy: "Teman Olahraga 🏃‍♂️", icon: "Dumbbell" },
  { value: "Teman Event / Konser", legacy: "Teman Event / Konser 🎟️", icon: "Ticket" },
  { value: "Ngobrol Seru", legacy: "Ngobrol Seru 💬", icon: "MessageCircle" },
  { value: "Cari Relasi Karir", legacy: "Cari Relasi Karir 💼", icon: "Briefcase" },
];

const intentLookup = new Map(
  TEMAN_INTENTS.flatMap((item) => [
    [item.value, item],
    [item.legacy, item],
  ])
);

export function getTemanIntent(rawIntent) {
  if (!rawIntent) return null;
  if (intentLookup.has(rawIntent)) return intentLookup.get(rawIntent);
  return TEMAN_INTENTS.find((item) => rawIntent.startsWith(item.value)) || null;
}

export function getTemanIntentLabel(rawIntent) {
  return getTemanIntent(rawIntent)?.value || rawIntent || "";
}

export function normalizeTemanIntent(rawIntent) {
  return getTemanIntentLabel(rawIntent);
}

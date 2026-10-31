import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function firstCodePoint(value) {
  const text = String(value ?? "").trim();
  return Array.from(text)[0] || "";
}

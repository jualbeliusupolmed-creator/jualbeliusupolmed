// Safe Haptic Feedback Engine for mobile web
// Checks for window and navigator.vibrate availability before executing.

export function hapticLight() {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(10);
    } catch {}
  }
}

export function hapticMedium() {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(20);
    } catch {}
  }
}

export function hapticSuccess() {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([12, 40, 16]);
    } catch {}
  }
}

export function hapticError() {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([30, 40, 30]);
    } catch {}
  }
}

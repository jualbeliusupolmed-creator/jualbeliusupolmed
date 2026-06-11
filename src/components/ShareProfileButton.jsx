"use client";

export default function ShareProfileButton() {
  return (
    <button
      onClick={() => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(window.location.href);
          alert("Link profil disalin!");
        }
      }}
      className="btn-outline py-2 px-4 text-xs rounded-xl"
    >
      🔗 Bagikan Profil
    </button>
  );
}

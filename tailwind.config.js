/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ink — warna aksi utama (near-black), kesan modern & clean
        primary: {
          DEFAULT: "#111111",
          dark: "#000000",
          light: "#3f3f46",
        },
        // Aksen tipis untuk highlight (harga, status aktif)
        accent: {
          DEFAULT: "#059669",
          dark: "#047857",
          light: "#10b981",
        },
        wa: {
          DEFAULT: "#25D366",
          dark: "#1ebe5a",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};

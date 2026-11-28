/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "475px",
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "#ecfeee",
          dim: "#cddfcf",
          bright: "#ecfeee",
          variant: "#d5e7d8",
          tint: "#31694e",
          "container-lowest": "#ffffff",
          "container-low": "#e6f8e8",
          container: "#e0f3e3",
          "container-high": "#dbeddd",
          "container-highest": "#d5e7d8",
        },
        "on-surface": {
          DEFAULT: "#101f15",
          variant: "#404943",
        },
        "on-background": "#101f15",
        "inverse-surface": "#253429",
        "inverse-on-surface": "#e3f5e6",
        outline: {
          DEFAULT: "#707972",
          variant: "#c0c9c1",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          container: "#134e35",
          "on-container": "#85be9e",
          fixed: "#b4f0cd",
          "fixed-dim": "#99d3b2",
          dark: "#002616",
          light: "#1b6345",
        },
        "on-primary": {
          DEFAULT: "#ffffff",
          container: "#85be9e",
          fixed: "#002113",
          "fixed-variant": "#165037",
        },
        "inverse-primary": "#99d3b2",
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          container: "#ceeb7a",
          fixed: "#ceeb7a",
          "fixed-dim": "#b5d263",
        },
        "on-secondary": {
          DEFAULT: "#ffffff",
          container: "#536b00",
          fixed: "#161f00",
          "fixed-variant": "#3b4d00",
        },
        tertiary: {
          DEFAULT: "#003709",
          container: "#005011",
          fixed: "#a3f69c",
          "fixed-dim": "#88d982",
        },
        "on-tertiary": {
          DEFAULT: "#ffffff",
          container: "#73c46f",
          fixed: "#002204",
          "fixed-variant": "#005312",
        },
        forest: {
          DEFAULT: "#134e35",
          dark: "#003622",
          light: "#1b6345",
          surface: "#0d3826",
          tint: "#f4faf5",
        },
        "lime-accent": "#bef264",
        "lime-dark": "#365314",
        "brand-bg": "#f4faf5",
        "card-bg": "#ffffff",
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          dark: "#003622",
          light: "#ceeb7a",
        },
        usu: {
          DEFAULT: "#134e35",
          light: "#1b6345",
          dark: "#003622",
          soft: "#e6f8e8",
        },
        polmed: {
          DEFAULT: "#134e35",
          light: "#1b6345",
          dark: "#003622",
          soft: "#d5e7d8",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        wa: {
          DEFAULT: "#25D366",
          dark: "#1ebe5a",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", '"Plus Jakarta Sans"', "Inter", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        display: ["var(--font-epilogue)", '"Epilogue"', "var(--font-jakarta)", '"Plus Jakarta Sans"', "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(19, 78, 53, 0.08)",
        "stitch-card": "0 4px 20px -4px rgba(19, 78, 53, 0.06)",
        "stitch-nav": "0 10px 30px rgba(10, 46, 31, 0.4)",
        glow: "0 0 20px -5px var(--tw-shadow-color)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
        float: "float 3s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};

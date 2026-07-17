/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        base: {
          DEFAULT: "#09090B",
          raised: "#0D0F14",
        },
        card: {
          DEFAULT: "#111827",
          hover: "#141B2D",
        },
        border: {
          DEFAULT: "#1E2433",
          subtle: "#171B26",
        },
        accent: {
          DEFAULT: "#3B82F6",
          dim: "#1D4ED8",
          soft: "rgba(59,130,246,0.12)",
        },
        indigo: {
          DEFAULT: "#6366F1",
        },
        signal: {
          verified: "#22C55E",
          pending: "#F59E0B",
          rejected: "#EF4444",
          info: "#38BDF8",
        },
        ink: {
          DEFAULT: "#E5E7EB",
          muted: "#94A3B8",
          faint: "#5B6472",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(59,130,246,0.15), 0 8px 30px -8px rgba(59,130,246,0.25)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(9,9,11,0) 0%, #09090B 85%), radial-gradient(120% 60% at 50% 0%, rgba(59,130,246,0.08) 0%, rgba(9,9,11,0) 60%)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.4)", opacity: "0" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scan-y": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "scan-y": "scan-y 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

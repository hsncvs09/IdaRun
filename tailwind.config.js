/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#070A0E",
          900: "#0B0F14",
          800: "#121821",
          700: "#1A2330",
          600: "#243041",
        },
        ember: {
          400: "#FF7849",
          500: "#FF5722",
          600: "#E64A19",
        },
        pine: {
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
        sand: {
          100: "#F4F5F7",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        display: ['"Outfit"', '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "0.85" },
          "70%": { transform: "scale(1.9)", opacity: "0" },
          "100%": { transform: "scale(1.9)", opacity: "0" },
        },
        runnerBob: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-3px)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        runnerBob: "runnerBob 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

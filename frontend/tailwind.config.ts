import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#050914",
          surface: "#0b1324",
          card: "#0f1b33",
          border: "#1b2c4e",
          cyan: "#06b6d4",
          neonBlue: "#38bdf8",
          violet: "#818cf8",
          accent: "#0284c7",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          800: "#1e293b",
          850: "#172033",
          900: "#0f172a",
          950: "#090d16",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        display: ["Outfit", "sans-serif"],
        mono: [
          '"JetBrains Mono"',
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      keyframes: {
        spinSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        flowLine: {
          "0%": { strokeDashoffset: "60" },
          "100%": { strokeDashoffset: "0" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.04)" },
        },
      },
      animation: {
        "spin-slow": "spinSlow 60s linear infinite",
        "pulse-slow": "pulseSlow 5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        flow: "flowLine 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;

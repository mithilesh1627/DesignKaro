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
        ground: "var(--ground)",
        brand: {
          bg: "var(--ground)",
          surface: "var(--surface-base)",
          card: "var(--surface-elevated)",
          border: "var(--surface-border)",
          cyan: "#3b82f6",
          neonBlue: "#60a5fa",
          violet: "#6366f1",
          accent: "#2563eb",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        surface: {
          ground: "var(--ground)",
          base: "var(--surface-base)",
          elevated: "var(--surface-elevated)",
          overlay: "var(--surface-overlay)",
          muted: "var(--surface-muted)",
          border: "var(--surface-border)",
          "border-subtle": "var(--surface-border-subtle)",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          800: "var(--surface-overlay)",
          850: "var(--surface-elevated)",
          900: "var(--surface-base)",
          950: "var(--ground)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Outfit", "sans-serif"],
        mono: [
          "var(--font-mono)",
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

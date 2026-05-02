import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0c0e10",
        "bg-surface": "#141719",
        "border-default": "#1e2428",
        "border-hover": "#2a3040",
        "text-primary": "#f1f5f9",
        "text-secondary": "#e2e8f0",
        "text-muted": "#475569",
        "accent-blue": "#0ea5e9",
        "accent-blue-hover": "#38bdf8",
        coral: "#e8613a",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

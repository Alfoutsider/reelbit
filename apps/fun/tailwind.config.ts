import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        rajdhani: ["Rajdhani", "sans-serif"],
        sans: ["Rajdhani", "system-ui", "sans-serif"],
      },
      colors: {
        gold: { DEFAULT: "#d4a017", light: "#f5c842", dim: "#a07810" },
        casino: { deep: "#06060f", dark: "#0a0a18", surface: "#0f0f22", card: "#12122a" },
      },
    },
  },
  plugins: [],
};
export default config;

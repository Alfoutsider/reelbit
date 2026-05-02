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
        silver: { DEFAULT: "#c0c0c0", light: "#e8e8e8", dark: "#8a8a8a" },
        casino: { deep: "#07070c", dark: "#0b0b14", surface: "#10101c", card: "#14141e" },
      },
    },
  },
  plugins: [],
};
export default config;

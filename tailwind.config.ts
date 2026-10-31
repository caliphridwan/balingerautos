import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.5rem" },
      screens: { "2xl": "1288px" },
    },
    extend: {
      colors: {
        obsidian: "#101114",
        graphite: {
          DEFAULT: "#1D2229",
          line: "#2E333B",
          muted: "#3A4049",
        },
        champagne: {
          DEFAULT: "#C9A66B",
          light: "#E7D9BC",
          hover: "#D8B97F",
        },
        // Accessible gold for text on light grounds (Champagne fails 4.5:1 on Ivory)
        deepgold: "#7A5C2C",
        ivory: {
          DEFAULT: "#F5F4F0",
          line: "#E4E1D8",
          soft: "#ECE9E1",
        },
        ink: {
          DEFAULT: "#101114",
          body: "#3A3D44",
          muted: "#5B5E66",
        },
        mist: {
          DEFAULT: "#B5B8BE",
          dim: "#8C9098",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.3em",
        button: "0.1em",
      },
      borderRadius: {
        DEFAULT: "2px",
      },
      maxWidth: {
        content: "1240px",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 400ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

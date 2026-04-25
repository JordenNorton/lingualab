import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#20201d",
        paper: "#f8f5ef",
        moss: "#5f7c6a",
        lagoon: "#1f7a77",
        coral: "#d75c48",
        saffron: "#c9921d",
        graphite: "#333333"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(32, 32, 29, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;

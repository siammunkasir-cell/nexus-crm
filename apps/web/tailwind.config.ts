import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "#0A0A0F",
          surface: "#111118",
          "surface-hover": "#18181F",
          border: "#1E1E2A",
          "border-subtle": "#16161F",
          accent: {
            primary: "#6366F1",
            secondary: "#8B5CF6",
            glow: "rgba(99, 102, 241, 0.15)",
          },
          text: {
            primary: "#F1F1F3",
            secondary: "#9191A4",
            muted: "#52525E",
          },
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          ai: "#06B6D4",
        },
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      spacing: {
        "0.5": "2px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(99, 102, 241, 0.15)",
        "glow-lg": "0 0 40px rgba(99, 102, 241, 0.15)",
        "glow-cyan": "0 0 20px rgba(6, 182, 212, 0.15)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
        panel: "300ms",
      },
      keyframes: {
        "slide-left": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.1)" },
          "100%": { boxShadow: "0 0 40px rgba(99, 102, 241, 0.25)" },
        },
      },
      animation: {
        "slide-left": "slide-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 150ms ease-out",
        "slide-right": "slideRight 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 150ms ease-out",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      transitionTimingFunction: {
        DEFAULT: "ease-out",
        panel: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
